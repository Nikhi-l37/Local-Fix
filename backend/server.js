require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { GoogleGenAI } = require('@google/genai');
const admin = require('firebase-admin');

const Worker = require('./models/Worker');
const Review = require('./models/Review');
const JobRequest = require('./models/JobRequest');

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' })); // increased limit for audio data

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let pushEnabled = false;
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    pushEnabled = true;
  } catch (err) {
    console.error('Firebase admin init failed:', err.message);
  }
}

let dbReady = false;

function formatMemberSince(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function toWorkerResponse(workerDoc, categoryOverride) {
  const coords = workerDoc.location?.coordinates || [];
  const lng = coords[0];
  const lat = coords[1];

  return {
    id: workerDoc._id.toString(),
    name: workerDoc.name,
    category: categoryOverride || (workerDoc.skills && workerDoc.skills.length ? workerDoc.skills[0] : 'General'),
    phone: workerDoc.phone,
    rating: workerDoc.rating?.average ?? 0,
    totalRatings: workerDoc.rating?.count ?? 0,
    jobsDone: workerDoc.jobsDone ?? 0,
    memberSince: formatMemberSince(workerDoc.createdAt),
    available: !!workerDoc.availability,
    lat,
    lng,
    isVerified: !!workerDoc.isVerified,
  };
}

function normalizeUserLocation(userLocation) {
  // Phase 2 shape: { latitude, longitude }.
  // Keep array fallback for compatibility with older app builds.
  if (
    userLocation &&
    typeof userLocation === 'object' &&
    !Array.isArray(userLocation) &&
    typeof userLocation.latitude === 'number' &&
    typeof userLocation.longitude === 'number'
  ) {
    return { latitude: userLocation.latitude, longitude: userLocation.longitude };
  }

  if (
    Array.isArray(userLocation) &&
    userLocation.length === 2 &&
    typeof userLocation[0] === 'number' &&
    typeof userLocation[1] === 'number'
  ) {
    return { longitude: userLocation[0], latitude: userLocation[1] };
  }

  return null;
}

async function getNearbyWorkersByCategory({ category, latitude, longitude, limit = 10, maxDistance = 10000 }) {
  const query = { availability: true };
  if (category !== 'General') query.skills = category;

  const workers = await Worker.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distanceMeters',
        maxDistance,
        query,
        spherical: true,
      },
    },
    { $limit: limit },
  ]);

  return workers.map((w) => ({
    ...toWorkerResponse(w, category),
    distanceKm: (w.distanceMeters / 1000).toFixed(1),
  }));
}

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function sendJobRequestPush(worker, jobRequest) {
  if (!pushEnabled || !worker?.fcmToken) return;

  try {
    await admin.messaging().send({
      token: worker.fcmToken,
      notification: {
        title: 'New Job Request',
        body: `${jobRequest.category} needed nearby - ${jobRequest.problem.slice(0, 50)}`,
      },
      data: {
        jobRequestId: jobRequest._id.toString(),
        workerId: worker._id.toString(),
      },
    });
  } catch (err) {
    console.error('Push send failed:', err.message);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const centerLng = 78.4867;
const centerLat = 17.3850;

// ========== SMART LOCAL CLASSIFIER (Fallback when Gemini API limit hit) ==========
const KEYWORD_MAP = {
  'Electrician': {
    // English
    keywords: ['fan', 'light', 'switch', 'wire', 'wiring', 'electric', 'electrician', 'bulb', 'tube', 'tubelight', 'mcb', 'fuse', 'socket', 'plug', 'voltage', 'current', 'short circuit', 'inverter', 'meter', 'board', 'circuit', 'breaker', 'led', 'chandelier', 'regulator'],
    // Hindi / Telugu / common transliteration
    hindiKeywords: ['pankha', 'bijli', 'batti', 'switch kharab', 'fan kharab', 'light nahi', 'current nahi', 'taar', 'bijli ka kaam'],
    phrases: ['not working fan', 'fan not working', 'no power', 'power cut', 'light not coming', 'fan speed', 'ceiling fan'],
  },
  'Plumber': {
    keywords: ['tap', 'pipe', 'plumb', 'plumber', 'leak', 'leaking', 'water', 'drain', 'drainage', 'bathroom', 'toilet', 'flush', 'basin', 'sink', 'geyser', 'tank', 'overhead', 'sump', 'pump', 'motor', 'boring', 'fitting', 'pipeline', 'blockage', 'clog', 'seepage'],
    hindiKeywords: ['nal', 'naल', 'pani', 'nalkа', 'toti', 'paani', 'tank', 'rishta', 'pipe toot', 'paani nahi'],
    phrases: ['water leaking', 'pipe broken', 'tap dripping', 'no water', 'water not coming', 'bathroom fitting', 'water tank'],
  },
  'Carpenter': {
    keywords: ['wood', 'wooden', 'door', 'furniture', 'cabinet', 'carpenter', 'wardrobe', 'cupboard', 'shelf', 'table', 'chair', 'bed', 'almirah', 'drawer', 'plywood', 'timber', 'hinge', 'latch', 'window', 'frame'],
    hindiKeywords: ['lakdi', 'darwaza', 'almari', 'khat', 'kursi', 'mez', 'karigar', 'mistri'],
    phrases: ['door repair', 'furniture repair', 'door not closing', 'broken door', 'new furniture', 'wood work'],
  },
  'AC Mechanic': {
    keywords: ['ac', 'air conditioner', 'cooling', 'cool', 'hvac', 'compressor', 'condenser', 'refrigerant', 'gas refill', 'split', 'window ac', 'thermostat', 'air cooler'],
    hindiKeywords: ['ac kharab', 'thanda nahi', 'ac gas', 'ac band', 'ac repair'],
    phrases: ['ac not cooling', 'ac not working', 'ac gas refill', 'ac installation', 'ac service', 'ac maintenance'],
  },
  'Painter': {
    keywords: ['paint', 'painting', 'painter', 'colour', 'color', 'whitewash', 'distemper', 'putty', 'primer', 'texture', 'enamel', 'emulsion', 'coat', 'coating', 'polish', 'varnish', 'stain', 'wallpaper'],
    hindiKeywords: ['rang', 'rangai', 'safedi', 'chuna', 'paint karna', 'deewar', 'deewar ka rang'],
    phrases: ['wall painting', 'house painting', 'room painting', 'paint peeling', 'need paint'],
  },
  'Cleaner': {
    keywords: ['clean', 'cleaning', 'cleaner', 'mop', 'sweep', 'dust', 'hygiene', 'sanitize', 'wash', 'scrub', 'polish', 'housekeep', 'maid', 'deep clean', 'sofa clean', 'carpet clean', 'bathroom clean'],
    hindiKeywords: ['safai', 'jhadu', 'pocha', 'saaf', 'ghar ki safai', 'dhona', 'kapda dhona'],
    phrases: ['house cleaning', 'deep clean', 'bathroom cleaning', 'kitchen cleaning', 'office cleaning'],
  },
  'JCB Operator': {
    keywords: ['jcb', 'excavator', 'excavation', 'digger', 'digging', 'earth', 'earthmover', 'backhoe', 'bulldozer', 'dumper', 'leveling', 'grading', 'trenching', 'foundation'],
    hindiKeywords: ['jcb chahiye', 'khudai', 'gadda', 'zameen', 'mitti'],
    phrases: ['need jcb', 'land leveling', 'earth moving', 'digging work', 'foundation digging'],
  },
  'Mason': {
    keywords: ['mason', 'masonry', 'cement', 'brick', 'construction', 'building', 'plaster', 'plastering', 'concrete', 'tile', 'tiling', 'flooring', 'floor', 'slab', 'column', 'beam', 'lintel', 'wall', 'boundary'],
    hindiKeywords: ['rajmistri', 'raj mistri', 'chuna', 'cement ka kaam', 'ghar banana', 'neev', 'deewar banana', 'plaster'],
    phrases: ['construction work', 'brick work', 'cement work', 'build wall', 'tile work', 'floor tile'],
  },
  'Welder': {
    keywords: ['weld', 'welding', 'welder', 'iron', 'metal', 'steel', 'gate', 'grill', 'grille', 'railing', 'fabrication', 'forge', 'cutting', 'arc', 'tig', 'mig'],
    hindiKeywords: ['welding ka kaam', 'lohe ka kaam', 'gate banana', 'jali', 'railing'],
    phrases: ['iron gate', 'metal work', 'gate repair', 'welding work', 'iron grille', 'window grill'],
  },
  'Pest Control': {
    keywords: ['pest', 'cockroach', 'rat', 'rats', 'mice', 'mouse', 'termite', 'ant', 'ants', 'mosquito', 'lizard', 'bug', 'bedbug', 'spider', 'insect', 'rodent', 'fumigation', 'spray'],
    hindiKeywords: ['keeda', 'keede', 'makode', 'chuha', 'deemak', 'machhar', 'chipkali', 'khatmal'],
    phrases: ['cockroach problem', 'rat problem', 'termite treatment', 'pest control', 'insect spray'],
  },
  'Tractor Operator': {
    keywords: ['tractor', 'plough', 'ploughing', 'harvest', 'harvesting', 'farm', 'farming', 'agriculture', 'field', 'crop', 'sowing', 'cultivate', 'cultivation', 'rotavator', 'thresher'],
    hindiKeywords: ['tractor chahiye', 'khet', 'kheti', 'hal', 'jotai', 'bhai', 'fasal'],
    phrases: ['tractor work', 'field work', 'farm work', 'land ploughing'],
  },
  'Appliance Repair': {
    keywords: ['fridge', 'refrigerator', 'washing machine', 'microwave', 'oven', 'mixer', 'grinder', 'chimney', 'dishwasher', 'dryer', 'iron box', 'induction', 'cooktop', 'rom', 'water purifier', 'ro'],
    hindiKeywords: ['fridge kharab', 'machine kharab', 'microwave kharab', 'geyser kharab'],
    phrases: ['fridge not cooling', 'washing machine repair', 'microwave not working', 'appliance repair', 'geyser repair'],
  },
  'Gardener': {
    keywords: ['garden', 'gardener', 'gardening', 'tree', 'lawn', 'plant', 'plants', 'grass', 'hedge', 'pruning', 'trim', 'trimming', 'landscape', 'landscaping', 'sapling', 'flower', 'pot', 'soil'],
    hindiKeywords: ['maal', 'mali', 'ped', 'paudha', 'ghar ka garden', 'lawn', 'ghass'],
    phrases: ['tree cutting', 'garden maintenance', 'lawn mowing', 'plant care', 'garden work'],
  },
  'Auto Mechanic': {
    keywords: ['bike', 'car', 'mechanic', 'vehicle', 'automobile', 'auto', 'puncture', 'tyre', 'tire', 'engine', 'brake', 'clutch', 'gear', 'oil', 'service', 'battery', 'radiator', 'silencer', 'chain', 'scooter', 'scooty', 'motorcycle', 'activa'],
    hindiKeywords: ['gaadi', 'gadi', 'bike kharab', 'car kharab', 'puncture', 'gaadi ka kaam'],
    phrases: ['bike repair', 'car repair', 'engine problem', 'bike not starting', 'car service', 'tyre puncture'],
  },
};

// Categories used in Gemini prompts come from the fallback keyword map.
// (Keep this in sync with KEYWORD_MAP keys.)
const ALL_CATEGORIES = Object.keys(KEYWORD_MAP);

function classifyLocally(description) {
  const desc = description.toLowerCase().trim();
  const scores = {};

  for (const [cat, data] of Object.entries(KEYWORD_MAP)) {
    let score = 0;

    // Check exact phrase matches first (highest weight)
    for (const phrase of data.phrases) {
      if (desc.includes(phrase)) score += 3;
    }

    // Check keyword matches
    for (const kw of data.keywords) {
      if (kw.includes(' ')) {
        // Multi-word keyword — exact substring
        if (desc.includes(kw)) score += 2;
      } else {
        // Single word — word boundary check to avoid false positives
        const regex = new RegExp(`\\b${kw}\\b|${kw}`, 'i');
        if (regex.test(desc)) score += 1;
      }
    }

    // Check Hindi/regional keywords
    for (const kw of data.hindiKeywords) {
      if (desc.includes(kw)) score += 2;
    }

    if (score > 0) scores[cat] = score;
  }

  // Return the category with the highest score
  if (Object.keys(scores).length === 0) return 'General';

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

// ========== SEARCH ROUTE ==========
app.post('/api/search', async (req, res) => {
  const { problemDescription, userLocation } = req.body;
  if (!problemDescription || !userLocation) {
    return res.status(400).json({ error: 'Problem description and user location are required' });
  }

  if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

  const normalizedLocation = normalizeUserLocation(userLocation);
  if (!normalizedLocation) {
    return res.status(400).json({ error: 'userLocation must be { latitude, longitude }' });
  }

  let category = 'General';
  let fallbackUsed = false;
  
  try {
    const prompt = `You are an AI classifier for a hyperlocal worker discovery app in India.

The user describes a problem or need. You must classify it into EXACTLY ONE of these worker categories:
${ALL_CATEGORIES.map(c => `"${c}"`).join(', ')}

RULES:
- Respond with ONLY the exact category string from the list above. Nothing else.
- "fan not working", "light not working", "switch broken", "wiring issue" → "Electrician"
- "tap leaking", "pipe broken", "bathroom fitting", "water tank" → "Plumber"
- "door repair", "furniture", "cabinet", "wooden work" → "Carpenter"
- "AC not cooling", "AC gas refill", "AC installation" → "AC Mechanic"
- "wall painting", "whitewash", "colour" → "Painter"
- "house cleaning", "deep clean", "bathroom clean" → "Cleaner"
- "JCB", "earth mover", "digging", "land leveling", "excavation" → "JCB Operator"
- "construction", "brick work", "plastering", "cement work", "building" → "Mason"
- "welding", "iron gate", "metal work", "grille" → "Welder"
- "cockroach", "rats", "termite", "insects", "pest" → "Pest Control"
- "tractor", "ploughing", "field work", "harvesting" → "Tractor Operator"
- "washing machine", "fridge", "microwave", "geyser repair" → "Appliance Repair"
- "garden", "tree cutting", "lawn", "plants" → "Gardener"
- "bike repair", "car repair", "puncture", "engine" → "Auto Mechanic"
- If the problem doesn't clearly fit any category, pick the CLOSEST match. Never invent new categories.

User's problem: "${problemDescription}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    category = response.text.trim().replace(/['\"]+/g, '');
    console.log(`Query: "${problemDescription}" → AI Category: "${category}"`);
    
  } catch (err) {
    fallbackUsed = true;
    if (err.status == 429 || (err.message && err.message.includes('429'))) {
      console.warn('⚠️ Google API Rate Limit Reached. Falling back to smart local classifier.');
    } else {
      console.error('AI Error:', err.message, '— Falling back to smart local classifier.');
    }
    
    // SMART LOCAL CLASSIFIER — keyword scoring with Hindi/regional support
    category = classifyLocally(problemDescription);
    console.log(`Query: "${problemDescription}" → Smart Fallback Category: "${category}"`);
  }

    try {
      const nearbyWorkers = await getNearbyWorkersByCategory({
        category,
        latitude: normalizedLocation.latitude,
        longitude: normalizedLocation.longitude,
        maxDistance: 10000,
        limit: 10,
      });

      res.json({ categoryIdentified: category, workers: nearbyWorkers, fallbackUsed });
    } catch (err) {
      console.error('Search filtering error:', err.message);
      res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// ========== VOICE SEARCH ROUTE ==========
app.post('/api/voice-search', async (req, res) => {
  try {
    const { audioBase64, userLocation } = req.body;
    if (!audioBase64 || !userLocation) {
      return res.status(400).json({ error: 'Audio data and user location are required' });
    }

    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const normalizedLocation = normalizeUserLocation(userLocation);
    if (!normalizedLocation) {
      return res.status(400).json({ error: 'userLocation must be { latitude, longitude }' });
    }

    // Write audio to temp file
    const tempFile = path.join(__dirname, 'temp_audio.m4a');
    fs.writeFileSync(tempFile, Buffer.from(audioBase64, 'base64'));

    // Send audio to Gemini for transcription + classification
    const prompt = `You are an AI assistant for a hyperlocal worker discovery app in India.

TASK: Listen to this audio and do TWO things:
1. Transcribe what the user said (they may speak in Hindi, Telugu, Tamil, Kannada, or English)
2. Classify their problem into EXACTLY ONE of these worker categories:
${ALL_CATEGORIES.map(c => `"${c}"`).join(', ')}

RESPOND IN THIS EXACT FORMAT (two lines only):
TRANSCRIPT: <what the user said, translated to English if needed>
CATEGORY: <exact category from the list>

CLASSIFICATION RULES:
- "fan not working", "light issue", "switch broken" → "Electrician"
- "tap leaking", "pipe broken", "bathroom fitting" → "Plumber"
- "door repair", "furniture", "cabinet" → "Carpenter"
- "AC not cooling", "AC gas refill" → "AC Mechanic"
- "wall painting", "whitewash" → "Painter"
- "house cleaning", "deep clean" → "Cleaner"
- "JCB", "earth mover", "digging", "land leveling" → "JCB Operator"
- "construction", "brick work", "plastering" → "Mason"
- "welding", "iron gate", "metal work" → "Welder"
- "cockroach", "rats", "termite", "pest" → "Pest Control"
- "tractor", "ploughing", "field work" → "Tractor Operator"
- "washing machine", "fridge", "microwave", "geyser" → "Appliance Repair"
- "garden", "tree cutting", "lawn" → "Gardener"
- "bike repair", "car repair", "puncture" → "Auto Mechanic"`;

    const audioData = {
      inlineData: {
        data: audioBase64,
        mimeType: 'audio/m4a'
      }
    };

    let responseText = "";
    let transcript = "Could not transcribe";
    let category = "General";

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              audioData,
              { text: prompt }
            ]
          }
        ],
      });

      responseText = response.text.trim();
      console.log('Voice AI Response:', responseText);

      // Parse response
      const transcriptMatch = responseText.match(/TRANSCRIPT:\s*(.+)/i);
      const categoryMatch = responseText.match(/CATEGORY:\s*(.+)/i);

      if (transcriptMatch) transcript = transcriptMatch[1].trim();
      if (categoryMatch) category = categoryMatch[1].trim().replace(/['"]+/g, '');

      console.log(`Voice: "${transcript}" → AI Category: "${category}"`);
    } catch (apiError) {
      if (apiError.status == 429 || (apiError.message && apiError.message.includes('429'))) {
        console.warn('⚠️ Google API Voice Rate Limit Reached! Voice search unavailable.');
        // Clean up temp file before returning
        try { fs.unlinkSync(tempFile); } catch(e) {}
        return res.json({
          transcript: 'Voice AI is temporarily unavailable (API limit reached). Please type your problem instead.',
          categoryIdentified: 'General',
          workers: [],
          fallbackUsed: true,
          voiceUnavailable: true
        });
      } else {
        throw apiError;
      }
    }

    // Clean up temp file
    try { fs.unlinkSync(tempFile); } catch(e) {}

    const nearbyWorkers = await getNearbyWorkersByCategory({
      category,
      latitude: normalizedLocation.latitude,
      longitude: normalizedLocation.longitude,
      maxDistance: 10000,
      limit: 10,
    });

    res.json({
      transcript,
      categoryIdentified: category,
      workers: nearbyWorkers,
      fallbackUsed: false
    });

  } catch (err) {
    console.error('Voice search error:', err);
    res.status(500).json({ error: 'Voice search failed', details: err.message });
  }
});

// ========== WORKER REGISTRATION ==========
app.post('/api/worker/register', async (req, res) => {
  try {
    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const { name, phone, aadhaarLast4, skills, lat, lng } = req.body;
    if (!name || !phone || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ error: 'Name, phone, and at least one skill are required' });
    }

    const safeSkills = Array.from(new Set(skills.filter(Boolean)));
    const derivedLng = typeof lng === 'number' ? lng : centerLng + (Math.random() - 0.5) * 0.02;
    const derivedLat = typeof lat === 'number' ? lat : centerLat + (Math.random() - 0.5) * 0.02;

    let worker = await Worker.findOne({ phone });

    if (worker) {
      worker.name = name;
      worker.aadhaarLast4 = aadhaarLast4 || worker.aadhaarLast4;
      worker.skills = Array.from(new Set([...(worker.skills || []), ...safeSkills]));
      worker.location = { type: 'Point', coordinates: [derivedLng, derivedLat] };
      worker.availability = true;
      await worker.save();
    } else {
      worker = await Worker.create({
        name,
        phone,
        aadhaarLast4: aadhaarLast4 || '****',
        skills: safeSkills,
        location: { type: 'Point', coordinates: [derivedLng, derivedLat] },
        availability: true,
        rating: { average: 0, count: 0 },
        jobsDone: 0,
        isVerified: false,
      });
    }

    console.log(`Worker registered/updated: ${worker.name} (${phone}) skills=${safeSkills.join(', ')}`);
    res.status(201).json({ message: 'Registration successful!', worker: toWorkerResponse(worker) });
  } catch (err) {
    console.error('Worker registration error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ========== GET WORKER PROFILE ==========
app.get('/api/worker/:id', async (req, res) => {
  try {
    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const worker = await Worker.findById(req.params.id).lean();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const workerReviews = await Review.find({ workerId: worker._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      ...toWorkerResponse(worker),
      reviews: workerReviews.map((r) => ({
        rating: r.rating,
        review: r.comment,
        reviewerName: 'Anonymous User',
        date: formatMemberSince(r.createdAt),
      })),
    });
  } catch (err) {
    console.error('Get worker profile error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ========== TOGGLE AVAILABILITY ==========
app.put('/api/worker/:id/availability', async (req, res) => {
  try {
    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    worker.availability = !worker.availability;
    await worker.save();

    console.log(`${worker.name} is now ${worker.availability ? 'Available 🟢' : 'Offline 🔴'}`);
    res.json({ message: `Now ${worker.availability ? 'Available' : 'Offline'}`, available: worker.availability });
  } catch (err) {
    console.error('Toggle availability error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ========== SAVE WORKER FCM TOKEN ==========
app.put('/api/worker/:id/fcm-token', async (req, res) => {
  try {
    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ error: 'fcmToken is required' });

    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { fcmToken },
      { new: true }
    );
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    res.json({ message: 'FCM token updated' });
  } catch (err) {
    console.error('Update FCM token error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ========== CREATE JOB REQUEST ==========
app.post('/api/job-request', async (req, res) => {
  try {
    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const { workerId, problem, category, userId, userLocation } = req.body;
    const normalizedLocation = normalizeUserLocation(userLocation);
    const normalizedProblem = (problem || '').trim();
    const normalizedUserId = (userId || '').trim();

    if (!workerId || !normalizedProblem || !category || !normalizedUserId || !normalizedLocation) {
      return res.status(400).json({ error: 'workerId, problem, category, userId, and userLocation are required' });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    // Prevent duplicate pending requests for same worker + user + problem.
    const existingPending = await JobRequest.findOne({
      workerId,
      userId: normalizedUserId,
      status: 'pending',
      problem: { $regex: new RegExp(`^${escapeRegex(normalizedProblem)}$`, 'i') },
    }).lean();

    if (existingPending) {
      return res.json({
        jobRequestId: existingPending._id.toString(),
        status: existingPending.status,
        deduped: true,
      });
    }

    const jobRequest = await JobRequest.create({
      userId: normalizedUserId,
      workerId,
      problem: normalizedProblem,
      category,
      userLocation: {
        latitude: normalizedLocation.latitude,
        longitude: normalizedLocation.longitude,
      },
      status: 'pending',
    });

    await sendJobRequestPush(worker, jobRequest);

    res.status(201).json({ jobRequestId: jobRequest._id.toString(), status: jobRequest.status });
  } catch (err) {
    console.error('Create job request error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ========== GET WORKER JOB REQUESTS ==========
app.get('/api/job-requests/worker/:workerId', async (req, res) => {
  try {
    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const worker = await Worker.findById(req.params.workerId).lean();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const requests = await JobRequest.find({ workerId: worker._id })
      .sort({ createdAt: -1 })
      .lean();

    const workerLng = worker.location?.coordinates?.[0];
    const workerLat = worker.location?.coordinates?.[1];

    const mapped = requests.map((r) => {
      let distanceKm = null;
      if (typeof workerLat === 'number' && typeof workerLng === 'number') {
        const d = getDistanceInMeters(workerLat, workerLng, r.userLocation.latitude, r.userLocation.longitude);
        distanceKm = (d / 1000).toFixed(1);
      }

      return {
        id: r._id.toString(),
        problem: r.problem,
        category: r.category,
        userId: r.userId,
        userLocation: r.userLocation,
        status: r.status,
        createdAt: r.createdAt,
        distanceKm,
      };
    });

    const pending = mapped.filter((r) => r.status === 'pending');
    const completedToday = mapped.filter((r) => r.status === 'accepted');

    res.json({ pending, completedToday });
  } catch (err) {
    console.error('Get job requests error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ========== RESPOND TO JOB REQUEST ==========
app.put('/api/job-request/:id/respond', async (req, res) => {
  try {
    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'status must be accepted or declined' });
    }

    const jobRequest = await JobRequest.findById(req.params.id);
    if (!jobRequest) return res.status(404).json({ error: 'Job request not found' });

    jobRequest.status = status;
    await jobRequest.save();

    if (status === 'accepted') {
      await Worker.findByIdAndUpdate(jobRequest.workerId, { $inc: { jobsDone: 1 } });
    }

    res.json({ message: `Job request ${status}`, status: jobRequest.status });
  } catch (err) {
    console.error('Respond job request error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ========== RATE WORKER ==========
app.post('/api/worker/:id/rate', async (req, res) => {
  try {
    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Persist review
    await Review.create({
      workerId: worker._id,
      rating,
      comment: review || '',
    });

    // Update running average (Phase 1 keeps prototype semantics: jobsDone increments on rating)
    const currentCount = worker.rating?.count ?? 0;
    const currentAvg = worker.rating?.average ?? 0;
    const newCount = currentCount + 1;
    const newAvg = (currentAvg * currentCount + rating) / newCount;

    worker.rating.average = parseFloat(newAvg.toFixed(1));
    worker.rating.count = newCount;
    worker.jobsDone += 1;

    await worker.save();

    console.log(`Rating submitted: ${worker.name} => ${rating}/5`);
    res.json({
      message: 'Rating submitted!',
      newRating: worker.rating.average,
      totalRatings: worker.rating.count,
    });
  } catch (err) {
    console.error('Rate worker error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ========== GET ALL WORKERS (for dashboard) ==========
app.get('/api/workers', async (req, res) => {
  try {
    if (!dbReady) return res.status(500).json({ error: 'Database not connected' });

    const { phone } = req.query;
    const query = phone ? { phone } : {};
    const workers = await Worker.find(query).lean();

    // Frontend dashboard expects fields like { id, category, rating, totalRatings, jobsDone, available, memberSince }
    const mapped = workers.map((w) => ({
      ...toWorkerResponse(w),
      category: w.skills && w.skills.length ? w.skills[0] : 'General',
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Get all workers error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

const PORT = process.env.PORT || 8080;
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    dbReady = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }

  app.listen(PORT, '0.0.0.0', () =>
    console.log(`Server running on 0.0.0.0:${PORT} — accessible from all devices on the network`)
  );
}

startServer();
