# LocalFix - Complete Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [File Structure](#file-structure)
5. [Features](#features)
6. [API Documentation](#api-documentation)
7. [Frontend Components](#frontend-components)
8. [Backend Logic](#backend-logic)
9. [Setup & Running](#setup--running)
10. [Design System](#design-system)

---

## 🎯 Project Overview

**LocalFix** is an AI-powered hyperlocal worker discovery mobile application designed for Indian markets. The app connects users with skilled local workers (plumbers, electricians, carpenters, etc.) using intelligent problem classification via Google's Gemini AI.

### Key Objectives:
- **Fast worker discovery** - Find nearby workers by describing your problem
- **AI-powered matching** - Uses Gemini AI to classify problems and match workers
- **Voice search support** - Search by voice in Hindi, English, or regional languages
- **Worker management** - Workers can register, manage availability, and track ratings
- **Rating & reviews** - Users can rate and review workers after service

### Status: 
**Prototype/MVP** - Features working locally with Expo Go. Uses in-memory database.

---

## 🛠️ Technology Stack

### Backend:
- **Runtime**: Node.js
- **Framework**: Express.js (v5.2.1)
- **AI**: Google Gemini API (@google/genai v1.46.0)
- **Database**: In-memory (mock data) - Ready for MongoDB/Mongoose
- **CORS**: Enabled for cross-origin requests
- **Middleware**: Express JSON parser with 10MB limit (for audio data)

### Frontend (React Native):
- **Framework**: React Native (0.81.5)
- **Expo**: v54.0.0 (development platform)
- **Navigation**: 
  - @react-navigation/native (v7.2.2)
  - @react-navigation/bottom-tabs (v7.15.9)
  - @react-navigation/native-stack (v7.14.10)
- **Features**:
  - expo-av (v16.0.8) - Audio recording for voice search
  - expo-location (v19.0.8) - GPS location detection
  - expo-linear-gradient (v55.0.13) - Modern gradient backgrounds
  - expo-file-system (v19.0.21) - File handling for audio
  - react-native-safe-area-context (v5.6.0) - Safe area handling
  - @expo/vector-icons - Material Design icons

### UI/Design:
- Custom theme system (frontend/theme.js)
- Modern color palette with professional gradients
- Responsive layouts with safe area detection

---

## 🏗️ Architecture

### System Design:

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HomeScreen (Worker Search)                          │   │
│  │  - Text search with problem description              │   │
│  │  - Voice search (audio recording)                    │   │
│  │  - Real-time worker list display                     │   │
│  │  - Worker detail modal with contact options          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WorkerLoginScreen (Registration)                    │   │
│  │  - Name, phone, Aadhaar input                        │   │
│  │  - Multi-skill selection                            │   │
│  │  - Creates new worker profile(s)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WorkerDashboardScreen (Worker Profile)              │   │
│  │  - Availability toggle (Online/Offline)              │   │
│  │  - Statistics (jobs done, rating)                    │   │
│  │  - Incoming job requests (mock)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  RateWorkerScreen (Review)                           │   │
│  │  - 1-5 star rating                                   │   │
│  │  - Optional review text                              │   │
│  │  - Success feedback                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↓ HTTP/REST ↑
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS BACKEND                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes:                                         │   │
│  │  - POST /api/search (text-based search)             │   │
│  │  - POST /api/voice-search (audio search)            │   │
│  │  - POST /api/worker/register (new worker)           │   │
│  │  - GET /api/workers (fetch workers)                 │   │
│  │  - GET /api/worker/:id (get profile)                │   │
│  │  - PUT /api/worker/:id/availability (toggle status)  │   │
│  │  - POST /api/worker/:id/rate (submit rating)        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Gemini AI Integration:                              │   │
│  │  - Text classification: problem → worker category   │   │
│  │  - Voice transcription + classification             │   │
│  │  - Multilingual support (Hindi, English, etc.)      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Smart Fallback Classifier:                          │   │
│  │  - Keyword-based classification (14 categories)     │   │
│  │  - Activates when Gemini API rate limit hit         │   │
│  │  - Hindi/regional keyword support                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  In-Memory Database:                                 │   │
│  │  - 20 mock workers (14 skill categories)            │   │
│  │  - Reviews store                                     │   │
│  │  - Location data (lat/lng)                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow:

**Text Search Flow:**
```
User enters problem description
    ↓
Send to /api/search endpoint
    ↓
Gemini AI classifies problem → worker category
    ↓
If Gemini fails/rate-limited:
    ↓
Fall back to keyword-based classifier
    ↓
Filter available workers by category
    ↓
Calculate distances & sort
    ↓
Return sorted worker list to app
```

**Voice Search Flow:**
```
User holds mic button → records audio
    ↓
Convert audio to base64
    ↓
Send to /api/voice-search endpoint
    ↓
Gemini AI transcribes audio + classifies
    ↓
Parse response (TRANSCRIPT + CATEGORY)
    ↓
Same worker filtering as text search
    ↓
Return transcript + worker list
```

---

## 📁 File Structure

```
Local Fix/
├── backend/
│   ├── server.js                 # Main Express app & API routes
│   ├── models/
│   │   └── Worker.js             # Mongoose schema (not in use yet)
│   ├── seed.js                   # Mock data seeder
│   ├── package.json              # Backend dependencies
│   └── .env                       # Environment variables (GEMINI_API_KEY)
│
├── frontend/
│   ├── App.js                    # Root component with tab navigation
│   ├── theme.js                  # Design system (colors, spacing, shadows)
│   ├── config.js                 # API base URL configuration
│   ├── index.js                  # App entry point
│   ├── app.json                  # Expo config
│   ├── eas.json                  # EAS build config
│   │
│   ├── screens/
│   │   ├── HomeScreen.js         # Main search interface
│   │   ├── WorkerLoginScreen.js  # Worker registration form
│   │   ├── RateWorkerScreen.js   # Rating interface
│   │   └── WorkerDashboardScreen.js # Worker profile dashboard
│   │
│   ├── package.json              # Frontend dependencies
│   └── .expo/                    # Expo development config
│
└── .git/                         # Version control
```

---

## ✨ Features

### For Customers:

1. **Problem Description Search**
   - Text input for describing maintenance/service needs
   - AI classifies problem into worker categories
   - See all matching workers with ratings

2. **Voice Search**
   - Press and hold mic button to record
   - Supports Hindi, English, and regional languages
   - AI transcribes and classifies automatically
   - Fallback to typing if voice fails

3. **Worker Discovery**
   - View worker profile details (name, rating, jobs done, distance)
   - See verified badge
   - Direct contact via Call or WhatsApp
   - Rate and review workers

4. **Location Services**
   - GPS detection of current location
   - Shows distance to each worker
   - Reverse geocoding to show city/area name

### For Workers:

1. **Registration**
   - Simple form with name, phone, Aadhaar (optional)
   - Select multiple skills
   - Instant registration

2. **Availability Management**
   - Toggle online/offline status
   - Appears in search results only when online

3. **Dashboard**
   - View personal statistics (jobs done, average rating)
   - See all registered skills
   - View incoming job requests (mock feature)

4. **Rating & Reviews**
   - Receive ratings from customers (1-5 stars)
   - View running average rating
   - Track total reviews received

---

## 🔌 API Documentation

### Base URL: 
`http://<LOCAL_IP>:5000`

### Endpoints:

#### 1. **POST /api/search** - Text-based worker search
```
Request:
{
  "problemDescription": "fan not working",
  "userLocation": [78.4867, 17.3850]  // [longitude, latitude]
}

Response:
{
  "categoryIdentified": "Electrician",
  "workers": [
    {
      "id": 1,
      "name": "Ramesh Kumar",
      "category": "Electrician",
      "phone": "+91 9876543210",
      "rating": 4.8,
      "totalRatings": 47,
      "jobsDone": 120,
      "memberSince": "Jan 2024",
      "available": true,
      "distanceKm": "2.3"
    },
    ...
  ],
  "fallbackUsed": false  // true if local classifier was used
}
```

#### 2. **POST /api/voice-search** - Voice-based worker search
```
Request:
{
  "audioBase64": "base64_encoded_audio_m4a",
  "userLocation": [78.4867, 17.3850]
}

Response:
{
  "transcript": "My fan is not working",
  "categoryIdentified": "Electrician",
  "workers": [...],
  "fallbackUsed": false,
  "voiceUnavailable": false
}

Note: If API rate limit hit:
{
  "transcript": "Voice AI unavailable...",
  "categoryIdentified": "General",
  "workers": [],
  "voiceUnavailable": true
}
```

#### 3. **POST /api/worker/register** - Register new worker
```
Request:
{
  "name": "John Doe",
  "phone": "+91 9876543210",
  "aadhaarLast4": "1234",
  "skills": ["Electrician", "Plumber"]
}

Response:
{
  "message": "Registration successful!",
  "workers": [
    {
      "id": 21,
      "name": "John Doe",
      "category": "Electrician",
      "phone": "+91 9876543210",
      "rating": 0,
      "totalRatings": 0,
      "jobsDone": 0,
      "memberSince": "May 2026",
      "available": true
    },
    {
      "id": 22,
      "name": "John Doe",
      "category": "Plumber",
      ...
    }
  ]
}
```

#### 4. **GET /api/workers** - Get all workers or filter by phone
```
Query Parameters:
?phone="+91 9876543210"  // Optional: filter by phone

Response:
[
  { id: 1, name: "Ramesh Kumar", category: "Electrician", ... },
  { id: 2, name: "Venkat Reddy", category: "Plumber", ... },
  ...
]
```

#### 5. **GET /api/worker/:id** - Get specific worker details
```
Response:
{
  "id": 1,
  "name": "Ramesh Kumar",
  "category": "Electrician",
  "phone": "+91 9876543210",
  "rating": 4.8,
  "totalRatings": 47,
  "jobsDone": 120,
  "memberSince": "Jan 2024",
  "available": true,
  "reviews": [
    {
      "rating": 5,
      "review": "Excellent work!",
      "reviewerName": "App User",
      "date": "02/05/2026"
    }
  ]
}
```

#### 6. **PUT /api/worker/:id/availability** - Toggle worker status
```
Response:
{
  "message": "Now Available",
  "available": true
}
```

#### 7. **POST /api/worker/:id/rate** - Rate a worker
```
Request:
{
  "rating": 5,
  "review": "Excellent service!",
  "reviewerName": "App User"
}

Response:
{
  "message": "Rating submitted!",
  "newRating": 4.8,
  "totalRatings": 48
}
```

---

## 💻 Frontend Components

### App.js - Root Navigation
- **Purpose**: Main app entry point with bottom tab navigation
- **Navigation Structure**:
  - Tab 1: "Find Worker" → HomeScreen + RateWorkerScreen
  - Tab 2: "I'm a Worker" → WorkerLoginScreen + WorkerDashboardScreen
- **Status Bar**: Purple/blue header with white text

### HomeScreen.js - Main Search Interface
- **Features**:
  - Search input field with placeholder hints
  - Microphone button for voice search
  - Suggestion chips (fan, pipe, furniture, etc.)
  - Search results with worker cards
  - Worker detail modal
  - Real-time location display
  - Loading states and animations

- **State Management**:
  - `problem` - Problem description text
  - `category` - Identified worker category
  - `workers` - List of matching workers
  - `isRecording` - Voice recording state
  - `voiceLoading` - Voice processing state
  - `selectedWorker` - Currently viewed worker details
  - `userLocation` - GPS coordinates

- **Key Functions**:
  - `handleSearch()` - Send text to search API
  - `startRecording()` / `stopRecording()` - Audio capture
  - `openWhatsApp()` - Launch WhatsApp with prefilled message
  - `renderWorker()` - Worker card component

### WorkerLoginScreen.js - Worker Registration
- **Features**:
  - Full name input
  - Phone number input with +91 prefix
  - Aadhaar verification (last 4 digits)
  - Multi-select skill chips (14 categories)
  - Registration button with loading state
  - Success feedback alert

- **Skills Supported**:
  Plumber, Electrician, Carpenter, AC Mechanic, Painter, Cleaner, JCB Operator, Mason, Welder, Pest Control, Tractor Operator, Appliance Repair, Gardener, Auto Mechanic

### RateWorkerScreen.js - Rating Interface
- **Features**:
  - Worker profile card display
  - Interactive 5-star rating system
  - Optional review text input
  - Submit button
  - Success confirmation screen

- **State**:
  - `rating` - Selected star rating (0-5)
  - `review` - Review text
  - `submitted` - Success state

### WorkerDashboardScreen.js - Worker Profile
- **Features**:
  - Profile header with name, phone, verification badge
  - Statistics cards (total jobs, avg rating, reviews)
  - Skill list with availability toggle
  - Incoming job requests (mock)

- **Functionality**:
  - Fetch worker profile by phone number
  - Toggle availability status in real-time
  - Display all registered skills

---

## 🧠 Backend Logic

### AI Classification System

#### Primary: Google Gemini API
- Uses `gemini-2.5-flash` model
- For text: Classifies problem description → category
- For voice: Transcribes audio + classifies automatically
- Supports multilingual input (Hindi, English, regional)

#### Fallback: Smart Local Classifier
- **Triggers when**: Gemini API rate limit (429 error)
- **Method**: Keyword scoring algorithm
- **Supported Categories**: All 14 worker categories

**Keyword Mapping Structure**:
```javascript
{
  "Electrician": {
    keywords: [fan, light, switch, wire, ...],
    hindiKeywords: [pankha, bijli, batti, ...],
    phrases: [not working fan, fan not working, ...]
  },
  "Plumber": {
    keywords: [tap, pipe, leak, water, ...],
    hindiKeywords: [nal, pani, ...],
    phrases: [water leaking, pipe broken, ...]
  },
  // ... 12 more categories
}
```

**Scoring Logic**:
- Phrase match: +3 points
- Keyword match (multi-word): +2 points
- Keyword match (single-word): +1 point
- Hindi keyword match: +2 points
- Return highest-scoring category

### Distance Calculation
- **Algorithm**: Haversine formula
- **Inputs**: User location, worker location
- **Outputs**: Distance in kilometers
- **Note**: Currently disabled for prototype; workers shown regardless of distance

### Rating System
- **Algorithm**: Running average
- **Formula**: `newRating = (oldRating * totalRatings + newRating) / (totalRatings + 1)`
- **Increments**: `jobsDone` counter on each rating
- **Storage**: In-memory reviews array

---

## 🚀 Setup & Running

### Backend Setup:

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file
# Add your Gemini API key:
# GEMINI_API_KEY=your_api_key_here

# 4. Start server
npm start

# Server runs on http://0.0.0.0:5000
# Accessible from all devices on the same network
```

### Frontend Setup:

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# Also install expo-linear-gradient (required for UI)
npm install expo-linear-gradient

# 3. Update config.js with your PC's IP
# Edit frontend/config.js:
# const API_BASE = 'http://YOUR_IP:5000';

# 4. Start Expo
npm start

# 5. Use Expo Go app on mobile:
# - Scan QR code from terminal
# - Or type 's' for manual connection
```

### Environment Variables:

**Backend (.env file)**:
```
GEMINI_API_KEY=your_google_genai_api_key
PORT=5000
```

### Network Setup:
1. Ensure mobile and PC are on **same Wi-Fi network**
2. Get PC IP: `ipconfig` (Windows) → IPv4 Address
3. Add Windows Firewall exception for Node.js
4. Update `frontend/config.js` with PC's IP

---

## 🎨 Design System

Located in: `frontend/theme.js`

### Color Palette:
- **Primary**: `#1e40af` - Deep blue (main CTAs, headers)
- **Accent**: `#0891b2` - Cyan (highlights)
- **Success**: `#059669` - Emerald (positive actions)
- **Warning**: `#d97706` - Amber (secondary actions)
- **Background**: `#f8fafc` - Light neutral
- **Surface**: `#ffffff` - Cards and surfaces
- **Text Primary**: `#0f172a` - Dark text
- **Text Secondary**: `#64748b` - Secondary text

### Shadows:
```javascript
xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
md: '0 4px 6px rgba(0, 0, 0, 0.1)',
lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
elevation: '0 20px 35px rgba(0, 0, 0, 0.15)'
```

### Typography:
- Headers: h1-h6 with bold weights
- Body text: 15px with 1.5 line height
- Labels: Small, uppercase with tracking

### Spacing Scale:
- xs: 4px, sm: 8px, md: 12px, lg: 16px
- xl: 20px, xxl: 24px, xxxl: 32px

### Gradients:
- **Primary**: `#1e40af` → `#1e3a8a`
- **Accent**: `#0891b2` → `#0369a1`
- **Success**: `#059669` → `#047857`

---

## 📊 Worker Categories (14 Total)

1. **Plumber** - Pipe work, taps, water tanks, geysers
2. **Electrician** - Fans, lights, switches, wiring, power issues
3. **Carpenter** - Furniture, doors, wooden fixtures
4. **AC Mechanic** - Air conditioner installation, repair, gas refill
5. **Painter** - Wall painting, whitewashing, distemper
6. **Cleaner** - House cleaning, deep cleaning, sanitization
7. **JCB Operator** - Excavation, earth moving, land leveling
8. **Mason** - Construction, brick work, plastering, tile work
9. **Welder** - Metal work, gates, railings, welding
10. **Pest Control** - Cockroach, rodent, termite elimination
11. **Tractor Operator** - Farm work, ploughing, harvesting
12. **Appliance Repair** - Washing machines, fridges, geysers, ovens
13. **Gardener** - Garden maintenance, tree cutting, lawn care
14. **Auto Mechanic** - Car/bike repair, puncture, engine work

---

## 🔐 Security Notes

### Current (Prototype):
- ⚠️ No authentication implemented
- ⚠️ In-memory database (data lost on restart)
- ⚠️ No input validation on many endpoints
- ⚠️ No rate limiting

### For Production:
- Implement JWT authentication
- Use MongoDB for persistent data
- Add input validation & sanitization
- Implement rate limiting
- Add SSL/HTTPS
- Secure API key handling
- Implement OTP verification
- Add Aadhaar verification integration

---

## 🐛 Known Issues & TODOs

### Prototype Limitations:
- Distance filtering disabled (shows all workers)
- Mock incoming job requests (not real)
- In-memory database resets on server restart
- No real-time notifications
- No payment system

### Pending Features:
- Real MongoDB integration
- Authentication system (JWT/OAuth)
- Push notifications for job requests
- Worker ratings/analytics dashboard
- Customer booking history
- Real-time chat between user and worker
- Payment integration
- Admin dashboard
- Improved UI for web (currently mobile-only)

---

## 📞 Support & Debugging

### Common Issues:

**"Cannot connect to backend"**
- Check if backend is running: `npm start` in backend folder
- Verify same Wi-Fi network on mobile and PC
- Check Windows Firewall allows Node.js
- Update IP in `frontend/config.js`

**"Voice search not working"**
- Grant microphone permissions to Expo Go app
- Check audio file is being created
- Verify Gemini API key is valid

**"Workers not showing"**
- Check category spelling (case-sensitive in code)
- Verify worker availability status is `true`
- Check network request in backend logs

---

## 📚 References

- **Express.js**: https://expressjs.com
- **React Native**: https://reactnative.dev
- **Expo**: https://expo.dev
- **Google Gemini API**: https://ai.google.dev
- **React Navigation**: https://reactnavigation.org

---

## 📝 Project Stats

- **Backend**: ~500 lines (Express + AI logic)
- **Frontend**: ~4000 lines (4 screens + navigation)
- **Design System**: ~100 tokens
- **API Endpoints**: 7 routes
- **Supported Worker Categories**: 14
- **Mock Workers**: 20 profiles
- **Supported Languages**: English + Hindi/regional transliteration

---

**Last Updated**: May 2026  
**Version**: 1.0 (MVP/Prototype)  
**Status**: ✅ Working (Expo Go)

