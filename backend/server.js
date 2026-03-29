require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // increased limit for audio data

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-Memory Database for Hackathon Prototype
const centerLng = 78.4867;
const centerLat = 17.3850;

let nextId = 21;

const mockWorkers = [
  // Plumbers
  { id: 1, name: "Ramesh Kumar", category: "Plumber", phone: "+91 9876543210", rating: 4.8, totalRatings: 47, jobsDone: 120, memberSince: "Jan 2024", available: true, lat: centerLat + 0.008, lng: centerLng + 0.006 },
  { id: 2, name: "Venkat Reddy", category: "Plumber", phone: "+91 9876543220", rating: 4.3, totalRatings: 23, jobsDone: 65, memberSince: "Mar 2024", available: true, lat: centerLat - 0.012, lng: centerLng + 0.009 },

  // Electricians
  { id: 3, name: "Suresh Babu", category: "Electrician", phone: "+91 9876543211", rating: 4.6, totalRatings: 38, jobsDone: 95, memberSince: "Feb 2024", available: true, lat: centerLat - 0.01, lng: centerLng - 0.015 },
  { id: 4, name: "Praveen Kumar", category: "Electrician", phone: "+91 9876543221", rating: 4.9, totalRatings: 62, jobsDone: 150, memberSince: "Dec 2023", available: true, lat: centerLat + 0.005, lng: centerLng - 0.008 },

  // Carpenters
  { id: 5, name: "Mahesh Yadav", category: "Carpenter", phone: "+91 9876543212", rating: 4.9, totalRatings: 55, jobsDone: 130, memberSince: "Jan 2024", available: true, lat: centerLat - 0.005, lng: centerLng + 0.005 },
  { id: 6, name: "Raju Sharma", category: "Carpenter", phone: "+91 9876543222", rating: 4.4, totalRatings: 18, jobsDone: 42, memberSince: "May 2024", available: true, lat: centerLat + 0.015, lng: centerLng - 0.01 },

  // AC Mechanics
  { id: 7, name: "Rajesh Gupta", category: "AC Mechanic", phone: "+91 9876543213", rating: 4.5, totalRatings: 30, jobsDone: 88, memberSince: "Apr 2024", available: true, lat: centerLat + 0.02, lng: centerLng - 0.02 },

  // Painters
  { id: 8, name: "Anil Verma", category: "Painter", phone: "+91 9876543214", rating: 4.7, totalRatings: 41, jobsDone: 110, memberSince: "Jan 2024", available: true, lat: centerLat + 0.003, lng: centerLng + 0.012 },
  { id: 9, name: "Srinivas Rao", category: "Painter", phone: "+91 9876543224", rating: 4.2, totalRatings: 15, jobsDone: 35, memberSince: "Jun 2024", available: true, lat: centerLat - 0.008, lng: centerLng - 0.005 },

  // Cleaners
  { id: 10, name: "Lakshmi Devi", category: "Cleaner", phone: "+91 9876543215", rating: 4.8, totalRatings: 50, jobsDone: 200, memberSince: "Nov 2023", available: true, lat: centerLat - 0.003, lng: centerLng - 0.007 },

  // JCB Operators
  { id: 11, name: "Narasimha Rao", category: "JCB Operator", phone: "+91 9876543216", rating: 4.6, totalRatings: 28, jobsDone: 75, memberSince: "Feb 2024", available: true, lat: centerLat + 0.018, lng: centerLng + 0.015 },
  { id: 12, name: "Balaji Reddy", category: "JCB Operator", phone: "+91 9876543226", rating: 4.4, totalRatings: 20, jobsDone: 50, memberSince: "Apr 2024", available: true, lat: centerLat - 0.02, lng: centerLng + 0.018 },

  // Masons
  { id: 13, name: "Mohan Das", category: "Mason", phone: "+91 9876543217", rating: 4.5, totalRatings: 35, jobsDone: 90, memberSince: "Mar 2024", available: true, lat: centerLat + 0.007, lng: centerLng - 0.012 },
  { id: 14, name: "Shankar Rao", category: "Mason", phone: "+91 9876543227", rating: 4.7, totalRatings: 42, jobsDone: 105, memberSince: "Jan 2024", available: true, lat: centerLat - 0.015, lng: centerLng + 0.003 },

  // Welders
  { id: 15, name: "Prabhakar Singh", category: "Welder", phone: "+91 9876543218", rating: 4.3, totalRatings: 19, jobsDone: 48, memberSince: "May 2024", available: true, lat: centerLat + 0.01, lng: centerLng + 0.018 },

  // Pest Control
  { id: 16, name: "Kishan Lal", category: "Pest Control", phone: "+91 9876543219", rating: 4.8, totalRatings: 45, jobsDone: 160, memberSince: "Dec 2023", available: true, lat: centerLat - 0.006, lng: centerLng + 0.014 },

  // Tractor Operators
  { id: 17, name: "Ranga Reddy", category: "Tractor Operator", phone: "+91 9876543230", rating: 4.5, totalRatings: 22, jobsDone: 60, memberSince: "Mar 2024", available: true, lat: centerLat + 0.012, lng: centerLng + 0.008 },

  // Appliance Repair
  { id: 18, name: "Satish Kumar", category: "Appliance Repair", phone: "+91 9876543231", rating: 4.6, totalRatings: 33, jobsDone: 85, memberSince: "Feb 2024", available: true, lat: centerLat - 0.004, lng: centerLng - 0.01 },

  // Gardener
  { id: 19, name: "Yellaiah", category: "Gardener", phone: "+91 9876543232", rating: 4.4, totalRatings: 16, jobsDone: 40, memberSince: "Jun 2024", available: true, lat: centerLat + 0.009, lng: centerLng - 0.004 },

  // Auto Mechanic
  { id: 20, name: "Farhan Khan", category: "Auto Mechanic", phone: "+91 9876543233", rating: 4.7, totalRatings: 39, jobsDone: 100, memberSince: "Jan 2024", available: true, lat: centerLat - 0.007, lng: centerLng + 0.011 },
];

// In-memory reviews store
const reviews = {};

const ALL_CATEGORIES = [...new Set(mockWorkers.map(w => w.category))];

// Haversine formula
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

  const [userLng, userLat] = userLocation;
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
    // PROTOTYPE: Skip distance filtering — show all matching workers regardless of location
    // TODO: Re-enable distance filter for production
    const nearbyWorkers = mockWorkers
      .filter(worker => {
        if (!worker.available) return false;
        if (worker.category.toLowerCase() !== category.toLowerCase() && category !== 'General') return false;
        return true;
      })
      .map(worker => ({
        ...worker,
        distanceKm: (Math.random() * 4 + 0.5).toFixed(1) // Simulated distance for prototype
      }))
      .sort((a, b) => parseFloat(a.distanceKm) - parseFloat(b.distanceKm));

    res.json({ categoryIdentified: category, workers: nearbyWorkers, fallbackUsed });
  } catch (err) {
    console.error('Filtering error:', err);
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

    const [userLng, userLat] = userLocation;

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

    // Filter workers by category and distance
    // PROTOTYPE: Skip distance filtering — show all matching workers regardless of location
    // TODO: Re-enable distance filter for production
    const nearbyWorkers = mockWorkers
      .filter(worker => {
        if (!worker.available) return false;
        if (category !== 'General' && worker.category.toLowerCase() !== category.toLowerCase()) return false;
        return true;
      })
      .map(worker => ({
        ...worker,
        distanceKm: (Math.random() * 4 + 0.5).toFixed(1) // Simulated distance for prototype
      }))
      .sort((a, b) => parseFloat(a.distanceKm) - parseFloat(b.distanceKm));

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
app.post('/api/worker/register', (req, res) => {
  try {
    const { name, phone, aadhaarLast4, skills, lat, lng } = req.body;
    if (!name || !phone || !skills || skills.length === 0) {
      return res.status(400).json({ error: 'Name, phone, and at least one skill are required' });
    }

    const newWorkers = skills.map(skill => {
      const worker = {
        id: nextId++,
        name,
        category: skill,
        phone,
        aadhaarLast4: aadhaarLast4 || '****',
        rating: 0,
        totalRatings: 0,
        jobsDone: 0,
        memberSince: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        available: true,
        lat: lat || centerLat + (Math.random() - 0.5) * 0.02,
        lng: lng || centerLng + (Math.random() - 0.5) * 0.02,
      };
      mockWorkers.push(worker);
      return worker;
    });

    console.log(`New worker registered: ${name} with skills: ${skills.join(', ')}`);
    res.json({ message: 'Registration successful!', workers: newWorkers });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ========== GET WORKER PROFILE ==========
app.get('/api/worker/:id', (req, res) => {
  const worker = mockWorkers.find(w => w.id === parseInt(req.params.id));
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const workerReviews = reviews[worker.id] || [];
  res.json({ ...worker, reviews: workerReviews });
});

// ========== TOGGLE AVAILABILITY ==========
app.put('/api/worker/:id/availability', (req, res) => {
  const worker = mockWorkers.find(w => w.id === parseInt(req.params.id));
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  worker.available = !worker.available;
  console.log(`${worker.name} is now ${worker.available ? 'Available 🟢' : 'Offline 🔴'}`);
  res.json({ message: `Now ${worker.available ? 'Available' : 'Offline'}`, available: worker.available });
});

// ========== RATE WORKER ==========
app.post('/api/worker/:id/rate', (req, res) => {
  const worker = mockWorkers.find(w => w.id === parseInt(req.params.id));
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const { rating, review, reviewerName } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  // Update running average
  const totalScore = worker.rating * worker.totalRatings + rating;
  worker.totalRatings += 1;
  worker.jobsDone += 1;
  worker.rating = parseFloat((totalScore / worker.totalRatings).toFixed(1));

  if (!reviews[worker.id]) reviews[worker.id] = [];
  reviews[worker.id].unshift({
    rating,
    review: review || '',
    reviewerName: reviewerName || 'Anonymous User',
    date: new Date().toLocaleDateString('en-IN')
  });

  console.log(`${worker.name} rated ${rating}/5 by ${reviewerName || 'Anonymous'}`);
  res.json({ message: 'Rating submitted!', newRating: worker.rating, totalRatings: worker.totalRatings });
});

// ========== GET ALL WORKERS (for dashboard) ==========
app.get('/api/workers', (req, res) => {
  const { phone } = req.query;
  if (phone) {
    const myWorkers = mockWorkers.filter(w => w.phone === phone);
    return res.json(myWorkers);
  }
  res.json(mockWorkers);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on 0.0.0.0:${PORT} — accessible from all devices on the network`));
