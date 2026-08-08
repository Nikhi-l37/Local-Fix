# LocalFix - Detailed Coding Documentation

## Table of Contents
1. [Backend Server Implementation](#backend-server-implementation)
2. [Frontend Navigation & Components](#frontend-navigation--components)
3. [API Integration](#api-integration)
4. [State Management & Hooks](#state-management--hooks)
5. [AI Classification Logic](#ai-classification-logic)
6. [Database Schema & Mock Data](#database-schema--mock-data)
7. [Styling & Theme System](#styling--theme-system)
8. [Code Workflows](#code-workflows)

---

## Backend Server Implementation

### File: `backend/server.js`

#### 1. **Server Initialization & Middleware**

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased for audio data

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

**Why?**
- `dotenv`: Load environment variables from .env
- `cors`: Allow requests from mobile app
- `express.json({ limit: '10mb' })`: Handle audio files (base64 encoded)
- Gemini AI: Initialize with API key for classification

#### 2. **Mock Data Structure**

```javascript
const centerLng = 78.4867;
const centerLat = 17.3850;  // Hyderabad center coordinates

let nextId = 21;  // Auto-increment for new workers

const mockWorkers = [
  {
    id: 1,
    name: "Ramesh Kumar",
    category: "Plumber",
    phone: "+91 9876543210",
    rating: 4.8,
    totalRatings: 47,
    jobsDone: 120,
    memberSince: "Jan 2024",
    available: true,
    lat: centerLat + 0.008,
    lng: centerLng + 0.006
  },
  // ... 19 more workers
];

const reviews = {};  // Store reviews by worker ID
```

**Structure Explanation:**
- Each worker has location coordinates for distance calculation
- `rating` + `totalRatings` used for running average calculation
- `available` flag determines visibility in search
- `reviews[workerId]` stores array of review objects

#### 3. **Distance Calculation (Haversine Formula)**

```javascript
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;  // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + 
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;  // Returns distance in meters
}
```

**How it works:**
- Converts latitude/longitude to radians
- Uses spherical trigonometry to calculate great-circle distance
- Returns meters (can be divided by 1000 for km)
- Currently NOT used (distance filter disabled for prototype)

#### 4. **Smart Local Classifier - Keyword Map**

```javascript
const KEYWORD_MAP = {
  'Electrician': {
    keywords: [
      'fan', 'light', 'switch', 'wire', 'wiring', 'electric', 
      'electrician', 'bulb', 'tube', 'socket', 'plug', 'voltage'
    ],
    hindiKeywords: [
      'pankha', 'bijli', 'batti', 'switch kharab', 
      'fan kharab', 'light nahi', 'taar'
    ],
    phrases: [
      'not working fan', 'fan not working', 'no power', 
      'power cut', 'light not coming'
    ]
  },
  'Plumber': {
    keywords: [
      'tap', 'pipe', 'plumb', 'leak', 'leaking', 'water', 
      'drain', 'bathroom', 'toilet', 'geyser', 'tank'
    ],
    hindiKeywords: [
      'nal', 'pani', 'tank', 'pipe toot', 'paani nahi'
    ],
    phrases: [
      'water leaking', 'pipe broken', 'tap dripping', 
      'no water', 'water not coming'
    ]
  },
  // ... 12 more categories
};
```

**Keyword Types:**
- `keywords`: General English words
- `hindiKeywords`: Hindi/regional words (phonetic transliteration)
- `phrases`: Multi-word exact matches (highest priority)

#### 5. **Local Classification Function**

```javascript
function classifyLocally(description) {
  const desc = description.toLowerCase().trim();
  const scores = {};

  for (const [cat, data] of Object.entries(KEYWORD_MAP)) {
    let score = 0;

    // Phase 1: Exact phrase matches (highest weight: +3)
    for (const phrase of data.phrases) {
      if (desc.includes(phrase)) score += 3;
    }

    // Phase 2: Keyword matches
    for (const kw of data.keywords) {
      if (kw.includes(' ')) {
        // Multi-word keyword - exact substring
        if (desc.includes(kw)) score += 2;
      } else {
        // Single word - word boundary to avoid false positives
        const regex = new RegExp(`\\b${kw}\\b|${kw}`, 'i');
        if (regex.test(desc)) score += 1;
      }
    }

    // Phase 3: Hindi/regional keywords
    for (const kw of data.hindiKeywords) {
      if (desc.includes(kw)) score += 2;
    }

    if (score > 0) scores[cat] = score;
  }

  // Return category with highest score
  if (Object.keys(scores).length === 0) return 'General';
  
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);
  
  return sorted[0][0];
}
```

**Algorithm Flow:**
1. Convert input to lowercase
2. Score each category based on matches
3. Return highest-scoring category
4. If no matches, return 'General'

#### 6. **Text Search Endpoint**

```javascript
app.post('/api/search', async (req, res) => {
  const { problemDescription, userLocation } = req.body;
  
  if (!problemDescription || !userLocation) {
    return res.status(400).json({ 
      error: 'Problem description and user location required' 
    });
  }

  const [userLng, userLat] = userLocation;
  let category = 'General';
  let fallbackUsed = false;
  
  try {
    // Step 1: Try AI classification
    const prompt = `You are an AI classifier for a hyperlocal worker discovery app in India.

The user describes a problem or need. You must classify it into EXACTLY ONE of these worker categories:
${ALL_CATEGORIES.map(c => `"${c}"`).join(', ')}

RULES:
- Respond with ONLY the exact category string from the list above. Nothing else.
- "fan not working", "light not working" → "Electrician"
- "tap leaking", "pipe broken" → "Plumber"
- etc...

User's problem: "${problemDescription}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    category = response.text.trim().replace(/['\"]+/g, '');
    console.log(`Query: "${problemDescription}" → AI Category: "${category}"`);
    
  } catch (err) {
    // Step 2: Fallback to local classifier
    fallbackUsed = true;
    
    if (err.status == 429 || err.message.includes('429')) {
      console.warn('⚠️ Google API Rate Limit. Using local classifier.');
    } else {
      console.error('AI Error:', err.message);
    }
    
    category = classifyLocally(problemDescription);
    console.log(`Query: "${problemDescription}" → Local Category: "${category}"`);
  }

  try {
    // Step 3: Filter workers
    const nearbyWorkers = mockWorkers
      .filter(worker => {
        if (!worker.available) return false;
        if (worker.category.toLowerCase() !== category.toLowerCase() && 
            category !== 'General') return false;
        return true;
      })
      .map(worker => ({
        ...worker,
        distanceKm: (Math.random() * 4 + 0.5).toFixed(1)  // Mock distance
      }))
      .sort((a, b) => parseFloat(a.distanceKm) - parseFloat(b.distanceKm));

    res.json({ 
      categoryIdentified: category, 
      workers: nearbyWorkers, 
      fallbackUsed 
    });
  } catch (err) {
    console.error('Filtering error:', err);
    res.status(500).json({ 
      error: 'Server error', 
      details: err.message 
    });
  }
});
```

**Flow:**
1. Receive problem description + user location
2. Try Gemini AI classification
3. If fails/rate-limited → use local classifier
4. Filter available workers by category
5. Sort by distance (simulated)
6. Return results

#### 7. **Voice Search Endpoint**

```javascript
app.post('/api/voice-search', async (req, res) => {
  try {
    const { audioBase64, userLocation } = req.body;
    
    if (!audioBase64 || !userLocation) {
      return res.status(400).json({ 
        error: 'Audio data and user location required' 
      });
    }

    const [userLng, userLat] = userLocation;
    
    // Step 1: Save audio to temp file
    const tempFile = path.join(__dirname, 'temp_audio.m4a');
    fs.writeFileSync(tempFile, Buffer.from(audioBase64, 'base64'));

    // Step 2: Send to Gemini for transcription + classification
    const prompt = `You are an AI assistant for a hyperlocal worker discovery app in India.

TASK: Listen to this audio and do TWO things:
1. Transcribe what the user said
2. Classify their problem into EXACTLY ONE of these worker categories:
${ALL_CATEGORIES.map(c => `"${c}"`).join(', ')}

RESPOND IN THIS EXACT FORMAT (two lines only):
TRANSCRIPT: <what the user said>
CATEGORY: <exact category from the list>

CLASSIFICATION RULES:
- "fan not working" → "Electrician"
- etc...`;

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
      
      // Step 3: Parse response
      const transcriptMatch = responseText.match(/TRANSCRIPT:\s*(.+)/i);
      const categoryMatch = responseText.match(/CATEGORY:\s*(.+)/i);

      if (transcriptMatch) transcript = transcriptMatch[1].trim();
      if (categoryMatch) category = categoryMatch[1].trim().replace(/['"]+/g, '');

    } catch (apiError) {
      if (apiError.status == 429) {
        try { fs.unlinkSync(tempFile); } catch(e) {}
        
        return res.json({
          transcript: 'Voice AI temporarily unavailable',
          categoryIdentified: 'General',
          workers: [],
          voiceUnavailable: true
        });
      } else {
        throw apiError;
      }
    }

    // Step 4: Clean up and return results
    try { fs.unlinkSync(tempFile); } catch(e) {}

    const nearbyWorkers = mockWorkers
      .filter(worker => {
        if (!worker.available) return false;
        if (category !== 'General' && 
            worker.category.toLowerCase() !== category.toLowerCase()) 
          return false;
        return true;
      })
      .map(worker => ({
        ...worker,
        distanceKm: (Math.random() * 4 + 0.5).toFixed(1)
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
    res.status(500).json({ 
      error: 'Voice search failed', 
      details: err.message 
    });
  }
});
```

**Flow:**
1. Decode base64 audio to m4a file
2. Send to Gemini API with audio
3. Parse response for TRANSCRIPT and CATEGORY
4. Delete temp file
5. Filter workers
6. Return results

#### 8. **Worker Registration**

```javascript
app.post('/api/worker/register', (req, res) => {
  try {
    const { name, phone, aadhaarLast4, skills, lat, lng } = req.body;
    
    if (!name || !phone || !skills || skills.length === 0) {
      return res.status(400).json({ 
        error: 'Name, phone, and at least one skill required' 
      });
    }

    // Create worker entry for EACH skill
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
        memberSince: new Date().toLocaleDateString('en-IN', { 
          month: 'short', 
          year: 'numeric' 
        }),
        available: true,
        lat: lat || centerLat + (Math.random() - 0.5) * 0.02,
        lng: lng || centerLng + (Math.random() - 0.5) * 0.02,
      };
      mockWorkers.push(worker);
      return worker;
    });

    console.log(`New worker: ${name} with skills: ${skills.join(', ')}`);
    res.json({ message: 'Registration successful!', workers: newWorkers });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: 'Server error', 
      details: err.message 
    });
  }
});
```

**Key Point:** Creates a separate worker entry for EACH selected skill

#### 9. **Rating Endpoint**

```javascript
app.post('/api/worker/:id/rate', (req, res) => {
  const worker = mockWorkers.find(w => w.id === parseInt(req.params.id));
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const { rating, review, reviewerName } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be 1-5' });
  }

  // Calculate running average
  const totalScore = worker.rating * worker.totalRatings + rating;
  worker.totalRatings += 1;
  worker.jobsDone += 1;
  worker.rating = parseFloat((totalScore / worker.totalRatings).toFixed(1));

  // Store review
  if (!reviews[worker.id]) reviews[worker.id] = [];
  reviews[worker.id].unshift({
    rating,
    review: review || '',
    reviewerName: reviewerName || 'Anonymous User',
    date: new Date().toLocaleDateString('en-IN')
  });

  console.log(`${worker.name} rated ${rating}/5 by ${reviewerName}`);
  res.json({ 
    message: 'Rating submitted!', 
    newRating: worker.rating, 
    totalRatings: worker.totalRatings 
  });
});
```

**Rating Calculation:**
```
newRating = (oldRating × oldCount + newRating) / newCount
```

#### 10. **Server Startup**

```javascript
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});
```

---

## Frontend Navigation & Components

### File: `frontend/App.js` - Root Navigation

```javascript
import React from 'react';
import { StatusBar, Text as RNText } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import RateWorkerScreen from './screens/RateWorkerScreen';
import WorkerLoginScreen from './screens/WorkerLoginScreen';
import WorkerDashboardScreen from './screens/WorkerDashboardScreen';
import { colors } from './theme';

const Tab = createBottomTabNavigator();
const UserStack = createNativeStackNavigator();
const WorkerStack = createNativeStackNavigator();

// Stack 1: User side (Find Worker + Rate)
function UserStackScreen() {
  return (
    <UserStack.Navigator screenOptions={{ headerShown: false }}>
      <UserStack.Screen 
        name="Home" 
        component={HomeScreen} 
      />
      <UserStack.Screen
        name="RateWorker"
        component={RateWorkerScreen}
        options={{ 
          headerShown: true, 
          title: '⭐ Rate Worker',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textInverse,
          headerTitleStyle: { fontWeight: '700' }
        }}
      />
    </UserStack.Navigator>
  );
}

// Stack 2: Worker side (Login + Dashboard)
function WorkerStackScreen() {
  return (
    <WorkerStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkerStack.Screen name="WorkerLogin" component={WorkerLoginScreen} />
      <WorkerStack.Screen name="WorkerDashboard" component={WorkerDashboardScreen} />
    </WorkerStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingBottom: 8,
              paddingTop: 8,
              height: 62,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
          }}
        >
          <Tab.Screen
            name="FindWorker"
            component={UserStackScreen}
            options={{
              tabBarLabel: 'Find Worker',
              tabBarIcon: ({ color }) => <TabIcon emoji="🔍" color={color} />,
            }}
          />
          <Tab.Screen
            name="ImAWorker"
            component={WorkerStackScreen}
            options={{
              tabBarLabel: "I'm a Worker",
              tabBarIcon: ({ color }) => <TabIcon emoji="👷" color={color} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function TabIcon({ emoji }) {
  return <RNText style={{ fontSize: 22 }}>{emoji}</RNText>;
}
```

**Navigation Structure:**
```
App
├── Tab.Navigator
│   ├── FindWorker Stack
│   │   ├── HomeScreen (search workers)
│   │   └── RateWorkerScreen (rate selected worker)
│   └── ImAWorker Stack
│       ├── WorkerLoginScreen (register)
│       └── WorkerDashboardScreen (manage profile)
```

---

## API Integration

### File: `frontend/config.js` - API Configuration

```javascript
const API_BASE = 'http://10.70.69.211:5000';  // Update with your PC IP

export default API_BASE;
```

### File: `frontend/screens/HomeScreen.js` - API Calls

#### Search API Call (Text)

```javascript
const handleSearch = async (query) => {
  const searchText = query || problem;
  
  if (!searchText.trim()) { 
    Alert.alert('Error', 'Please describe your problem!'); 
    return; 
  }

  setLoading(true);
  setCategory('');
  setWorkers([]);
  setFallbackUsed(false);
  
  try {
    const response = await fetch(`${API_BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        problemDescription: searchText, 
        userLocation 
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      setCategory(data.categoryIdentified);
      setWorkers(data.workers);
      setFallbackUsed(data.fallbackUsed || false);
      
      if (data.workers.length === 0) {
        Alert.alert(
          'No workers found', 
          `Need: "${data.categoryIdentified}" — none nearby.`
        );
      }
    } else { 
      Alert.alert('Error', data.error || 'Something went wrong'); 
    }
  } catch (error) {
    Alert.alert(
      'Network Error', 
      'Ensure backend is running and phone is on same Wi-Fi.'
    );
  } finally { 
    setLoading(false); 
  }
};
```

#### Voice Search API Call

```javascript
const stopRecording = async () => {
  setIsRecording(false);
  pulseAnim.stopAnimation();
  pulseAnim.setValue(1);

  const currentRecording = recordingRef.current;
  if (!currentRecording) return;
  recordingRef.current = null;

  try {
    await currentRecording.stopAndUnloadAsync();
    const uri = currentRecording.getURI();

    if (uri) {
      setVoiceLoading(true);
      setCategory('');
      setWorkers([]);
      setProblem('🎤 Processing voice...');

      // Read audio file as base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64'
      });

      // Send to backend
      const response = await fetch(`${API_BASE}/api/voice-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64Audio, userLocation })
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.voiceUnavailable) {
          setProblem('');
          setFallbackUsed(true);
          Alert.alert(
            '🎤 Voice AI Unavailable', 
            'AI quota exceeded. Please type instead.'
          );
        } else {
          setProblem(data.transcript || '🎤 Voice search');
          setCategory(data.categoryIdentified);
          setWorkers(data.workers);
          setFallbackUsed(data.fallbackUsed || false);
        }
      } else {
        setProblem('');
        Alert.alert('Error', data.error || 'Voice search failed');
      }
      setVoiceLoading(false);
    }
  } catch (err) {
    console.error('Failed to process recording', err);
    setVoiceLoading(false);
    setProblem('');
    Alert.alert('Error', 'Voice processing failed.');
  }
};
```

---

## State Management & Hooks

### File: `frontend/screens/HomeScreen.js` - State Management

```javascript
import React, { useState, useRef } from 'react';
// ... other imports

export default function HomeScreen({ navigation }) {
  // Search state
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [category, setCategory] = useState('');
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  // Voice recording state
  const recordingRef = useRef(null);
  const isPreparingRecording = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Location state
  const [userLocation, setUserLocation] = useState([78.4867, 17.3850]);
  const [locationName, setLocationName] = useState('📍 Fetching...');

  // Get safe area insets
  const insets = useSafeAreaInsets();

  // Fetch location on mount
  React.useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationName('📍 Permission denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        setUserLocation([
          location.coords.longitude, 
          location.coords.latitude
        ]);

        // Reverse geocode to get place name
        let geo = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (geo && geo.length > 0) {
          const place = geo[0];
          setLocationName(
            `📍 ${place.city || place.district}, ${place.region || place.country}`
          );
        } else {
          setLocationName('📍 Location Found');
        }
      } catch (err) {
        console.warn(err);
        setLocationName('📍 Location Error');
      }
    })();
  }, []);

  // ... rest of component
}
```

### File: `frontend/screens/WorkerDashboardScreen.js` - useEffect & useFocusEffect

```javascript
import { useFocusEffect } from '@react-navigation/native';

export default function WorkerDashboardScreen({ route }) {
  const { phone, workerName } = route.params;
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const fetchMyProfile = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/workers?phone=${encodeURIComponent(phone)}`
      );
      const data = await res.json();
      setWorkers(data);
    } catch (err) {
      Alert.alert('Error', 'Could not fetch profile');
    } finally { 
      setLoading(false); 
    }
  };

  // Fetch when screen is focused (tab switched back)
  useFocusEffect(useCallback(() => { 
    fetchMyProfile(); 
  }, []));

  const toggleAvailability = async (workerId) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/worker/${workerId}/availability`, 
        { method: 'PUT' }
      );
      const data = await res.json();
      
      // Update state immutably
      setWorkers(prev => prev.map(w => 
        w.id === workerId ? { ...w, available: data.available } : w
      ));
    } catch (err) {
      Alert.alert('Error', 'Could not update availability');
    }
  };

  // Compute stats
  const totalJobs = workers.reduce((sum, w) => sum + (w.jobsDone || 0), 0);
  const avgRating = workers.length > 0 
    ? (workers.reduce((sum, w) => sum + w.rating, 0) / workers.length).toFixed(1)
    : '0';
  const totalReviews = workers.reduce((sum, w) => sum + (w.totalRatings || 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalJobs}</Text>
          <Text style={styles.statLabel}>Jobs Done</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>⭐ {avgRating}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalReviews}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      {/* Skills list */}
      <FlatList
        data={workers}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.skillCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.skillName}>{item.category}</Text>
              <Text style={styles.skillMeta}>
                ⭐ {item.rating} · {item.jobsDone} jobs
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.availToggle,
                item.available ? styles.toggleAvailable : styles.toggleOffline
              ]}
              onPress={() => toggleAvailability(item.id)}
            >
              <Text style={styles.toggleText}>
                {item.available ? '🟢 Online' : '🔴 Offline'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
```

---

## AI Classification Logic

### Gemini API Prompt Engineering

**Text Classification Prompt:**

```
You are an AI classifier for a hyperlocal worker discovery app in India.

The user describes a problem or need. You must classify it into EXACTLY ONE of these worker categories:
"Plumber", "Electrician", "Carpenter", "AC Mechanic", "Painter", "Cleaner", "JCB Operator", "Mason", "Welder", "Pest Control", "Tractor Operator", "Appliance Repair", "Gardener", "Auto Mechanic"

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
- If the problem doesn't clearly fit any category, pick the CLOSEST match.

User's problem: "fan not working"
```

**Voice Classification Prompt:**

```
You are an AI assistant for a hyperlocal worker discovery app in India.

TASK: Listen to this audio and do TWO things:
1. Transcribe what the user said (they may speak in Hindi, Telugu, Tamil, Kannada, or English)
2. Classify their problem into EXACTLY ONE of these worker categories:
"Plumber", "Electrician", "Carpenter", "AC Mechanic", "Painter", "Cleaner", "JCB Operator", "Mason", "Welder", "Pest Control", "Tractor Operator", "Appliance Repair", "Gardener", "Auto Mechanic"

RESPOND IN THIS EXACT FORMAT (two lines only):
TRANSCRIPT: <what the user said, translated to English if needed>
CATEGORY: <exact category from the list>

CLASSIFICATION RULES:
- "fan not working", "light issue", "switch broken" → "Electrician"
- "tap leaking", "pipe broken", "bathroom fitting" → "Plumber"
- etc...
```

### Response Parsing

```javascript
// For text search
category = response.text.trim().replace(/['\"]+/g, '');

// For voice search
const transcriptMatch = responseText.match(/TRANSCRIPT:\s*(.+)/i);
const categoryMatch = responseText.match(/CATEGORY:\s*(.+)/i);

if (transcriptMatch) transcript = transcriptMatch[1].trim();
if (categoryMatch) category = categoryMatch[1].trim().replace(/['"]+/g, '');
```

---

## Database Schema & Mock Data

### File: `backend/models/Worker.js` - Mongoose Schema

```javascript
const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },  // Skill type
  phone: { type: String, required: true },
  rating: { type: Number, default: 4.5 },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: true
    }
  }
});

// Create geospatial index for location-based queries
WorkerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Worker', WorkerSchema);
```

**Note:** Schema exists but NOT currently used (using in-memory mock data)

### Mock Workers Data Structure

```javascript
{
  id: 1,                           // Unique identifier
  name: "Ramesh Kumar",            // Worker name
  category: "Plumber",             // Skill category
  phone: "+91 9876543210",         // Contact number
  rating: 4.8,                     // Average rating (float)
  totalRatings: 47,                // Number of ratings received
  jobsDone: 120,                   // Total jobs completed
  memberSince: "Jan 2024",         // Formatted date
  available: true,                 // Online/offline status
  lat: 17.3858,                    // Latitude
  lng: 78.4927                     // Longitude
}
```

### Reviews Data Structure

```javascript
reviews[1] = [
  {
    rating: 5,
    review: "Excellent work, very professional!",
    reviewerName: "App User",
    date: "02/05/2026"
  },
  {
    rating: 4,
    review: "Good service, arrived on time",
    reviewerName: "Anonymous User",
    date: "01/05/2026"
  }
]
```

---

## Styling & Theme System

### File: `frontend/theme.js` - Theme Configuration

```javascript
export const colors = {
  // Primary Colors
  primary: '#1e40af',        // Deep blue
  primaryDark: '#1e3a8a',    // Darker shade
  primaryLight: '#3b82f6',   // Lighter shade

  // Accent & Secondary
  accent: '#0891b2',         // Cyan
  accentLight: '#06b6d4',    // Light cyan

  // Status Colors
  success: '#059669',        // Emerald
  successLight: '#10b981',   // Light emerald
  warning: '#d97706',        // Amber
  warningLight: '#f59e0b',   // Light amber
  error: '#dc2626',          // Red
  errorLight: '#ef4444',     // Light red

  // Neutral Colors
  background: '#f8fafc',     // Light background
  surface: '#ffffff',        // Card surface
  surfaceHover: '#f1f5f9',   // Hover state

  // Text Colors
  textPrimary: '#0f172a',    // Dark text
  textSecondary: '#64748b',  // Secondary text
  textTertiary: '#94a3b8',   // Tertiary text
  textInverse: '#ffffff',    // Text on dark

  // Border & Divider
  border: '#e2e8f0',         // Light border
  borderDark: '#cbd5e1',     // Dark border
  divider: '#f1f5f9',        // Divider

  // Special backgrounds
  greenBg: '#d1fae5',        // Green background
  redBg: '#fee2e2',          // Red background
  yellowBg: '#fef3c7',       // Yellow background
  blueBg: '#dbeafe',         // Blue background
};

export const shadows = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  elevation: '0 20px 35px rgba(0, 0, 0, 0.15)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 1.2 },
  h2: { fontSize: 28, fontWeight: 'bold', lineHeight: 1.2 },
  h3: { fontSize: 24, fontWeight: 'bold', lineHeight: 1.3 },
  h4: { fontSize: 20, fontWeight: 'bold', lineHeight: 1.3 },
  h5: { fontSize: 18, fontWeight: '600', lineHeight: 1.4 },
  h6: { fontSize: 16, fontWeight: '600', lineHeight: 1.4 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 1.5 },
  bodyMedium: { fontSize: 14, fontWeight: '500', lineHeight: 1.5 },
  bodySemibold: { fontSize: 15, fontWeight: '600', lineHeight: 1.5 },
  small: { fontSize: 13, fontWeight: '400', lineHeight: 1.4 },
  smallMedium: { fontSize: 13, fontWeight: '500', lineHeight: 1.4 },
  xs: { fontSize: 11, fontWeight: '500', lineHeight: 1.3 },
  xsMedium: { fontSize: 12, fontWeight: '500', lineHeight: 1.4 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 1.4 },
};

export const gradients = {
  primaryGradient: {
    colors: ['#1e40af', '#1e3a8a'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  accentGradient: {
    colors: ['#0891b2', '#0369a1'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  successGradient: {
    colors: ['#059669', '#047857'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

export default { colors, shadows, spacing, borderRadius, typography, gradients };
```

### Usage in Components

```javascript
import { colors, spacing, borderRadius, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    paddingHorizontal: spacing.xl 
  },
  headerCard: { 
    borderRadius: borderRadius.xl, 
    padding: spacing.lg, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 12, 
    elevation: 8 
  },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: colors.textInverse 
  },
});

// Using gradient
<LinearGradient 
  colors={[colors.primary, colors.primaryDark]} 
  start={{ x: 0, y: 0 }} 
  end={{ x: 1, y: 1 }} 
  style={styles.headerCard}
>
  {/* Content */}
</LinearGradient>
```

---

## Code Workflows

### Workflow 1: Complete Text Search Flow

```
User types "fan not working" → Taps Search button
    ↓
HomeScreen.handleSearch()
    ↓
fetch(`http://IP:5000/api/search`, {
  method: 'POST',
  body: {
    problemDescription: "fan not working",
    userLocation: [78.4867, 17.3850]
  }
})
    ↓
BACKEND: /api/search endpoint receives request
    ↓
Try Gemini AI classification
    • Sends prompt with problem description
    • Gemini returns "Electrician"
    ↓
mockWorkers.filter(w => 
  w.available === true && 
  w.category === "Electrician"
)
    ↓
Mock distance calculation & sorting
    ↓
Return { 
  categoryIdentified: "Electrician", 
  workers: [Ramesh Kumar, Suresh Babu, ...], 
  fallbackUsed: false 
}
    ↓
FRONTEND: setCategory("Electrician")
    ↓
FlatList renders worker cards
    ↓
User taps on Ramesh Kumar card → Opens modal
    ↓
Modal shows full details + Call/WhatsApp buttons
```

### Workflow 2: Voice Search with Fallback

```
User holds mic button → Records "Pankha kharab hai" (Hindi)
    ↓
stopRecording()
    • Convert audio to base64
    • FileSystem.readAsStringAsync(uri, encoding: 'base64')
    ↓
fetch(`http://IP:5000/api/voice-search`, {
  method: 'POST',
  body: {
    audioBase64: "base64data...",
    userLocation: [78.4867, 17.3850]
  }
})
    ↓
BACKEND: /api/voice-search endpoint
    ↓
Save base64 to temp file
    ↓
Send to Gemini with audio
    • Gemini transcribes: "Fan not working"
    • Gemini classifies: "Electrician"
    • Responds: "TRANSCRIPT: My fan is not working\nCATEGORY: Electrician"
    ↓
Parse response with regex
    • Extract TRANSCRIPT: "My fan is not working"
    • Extract CATEGORY: "Electrician"
    ↓
Filter workers
    ↓
Return {
  transcript: "My fan is not working",
  categoryIdentified: "Electrician",
  workers: [...],
  fallbackUsed: false
}
    ↓
FRONTEND: setProblem("My fan is not working")
    ↓
Show results same as text search
    ↓
If Gemini returns 429 error:
    ↓
Return { voiceUnavailable: true, transcript: "Voice AI unavailable" }
    ↓
Show alert: "Voice feature temporarily unavailable"
```

### Workflow 3: Worker Registration

```
User fills registration form:
  • Name: "John Doe"
  • Phone: "9876543210"
  • Skills: ["Electrician", "Plumber"]
    ↓
Tap "Register Free" button
    ↓
WorkerLoginScreen.handleRegister()
    ↓
fetch(`http://IP:5000/api/worker/register`, {
  method: 'POST',
  body: {
    name: "John Doe",
    phone: "+91 9876543210",
    aadhaarLast4: "1234",
    skills: ["Electrician", "Plumber"]
  }
})
    ↓
BACKEND: /api/worker/register endpoint
    ↓
For each skill in ["Electrician", "Plumber"]:
    ↓
Create new worker object:
    • id: nextId++ → 21
    • name: "John Doe"
    • category: "Electrician" (for first)
    • phone: "+91 9876543210"
    • rating: 0
    • totalRatings: 0
    • jobsDone: 0
    • memberSince: "May 2026"
    • available: true
    • lat/lng: Random nearby coordinates
    ↓
Push to mockWorkers array
    ↓
Return:
{
  message: "Registration successful!",
  workers: [
    { id: 21, name: "John Doe", category: "Electrician", ... },
    { id: 22, name: "John Doe", category: "Plumber", ... }
  ]
}
    ↓
FRONTEND: Show success alert
    ↓
Navigate to WorkerDashboard with:
    • phone: "+91 9876543210"
    • workerName: "John Doe"
```

### Workflow 4: Rating a Worker

```
User opens RateWorkerScreen for Ramesh Kumar
    ↓
Tap 5 stars
    ↓
Type review: "Excellent work!"
    ↓
Tap "Submit Rating"
    ↓
RateWorkerScreen.handleSubmit()
    ↓
fetch(`http://IP:5000/api/worker/1/rate`, {
  method: 'POST',
  body: {
    rating: 5,
    review: "Excellent work!",
    reviewerName: "App User"
  }
})
    ↓
BACKEND: /api/worker/:id/rate endpoint
    ↓
Find worker: mockWorkers[0] (Ramesh Kumar)
    ↓
Calculate new rating:
    • totalScore = 4.8 × 47 + 5 = 230.6 + 5 = 235.6
    • totalRatings = 47 + 1 = 48
    • newRating = 235.6 / 48 = 4.908 → 4.9 (rounded)
    ↓
Update worker object:
    • worker.rating = 4.9
    • worker.totalRatings = 48
    • worker.jobsDone = 121
    ↓
Store review:
    reviews[1] = [
      { rating: 5, review: "Excellent work!", date: "02/05/2026" },
      ... previous reviews
    ]
    ↓
Return:
{
  message: "Rating submitted!",
  newRating: 4.9,
  totalRatings: 48
}
    ↓
FRONTEND: Show success screen
    ↓
After 2 seconds: Navigate back to HomeScreen
```

---

This is the detailed coding documentation with actual implementation details! 🚀

