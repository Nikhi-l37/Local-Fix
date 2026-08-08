# LocalFix Project Overview

## What is LocalFix?
**AI-powered hyperlocal worker discovery app** for India. Helps users find nearby workers (plumbers, electricians, carpenters, etc.) using:
- Text search with AI classification (Gemini API)
- Voice search (audio transcription + classification)
- Smart fallback classifier (keyword-based when API quota hit)

## Architecture

### Backend (Express + Node.js)
- **Port**: 5000, runs at `0.0.0.0` (network accessible)
- **Location**: `/d/projects/Local Fix/backend/`
- **Key files**:
  - `server.js` (503 lines) - Main Express app with API routes
  - `seed.js` - MongoDB seeding script
  - `models/Worker.js` - Mongoose schema (not actively used, in-memory mock data used instead)

### Frontend (React Native + Expo)
- **Location**: `/d/projects/Local Fix/frontend/`
- **Technology**: React Native 0.81.5, Expo ~54.0.0
- **Key files**:
  - `App.js` - Tab navigator (FindWorker + I'm a Worker)
  - `screens/HomeScreen.js` (429 lines) - Text/voice search, worker cards
  - `screens/WorkerLoginScreen.js` (118 lines) - Worker registration
  - `screens/WorkerDashboardScreen.js` (164 lines) - Worker profile & availability
  - `screens/RateWorkerScreen.js` (107 lines) - Star rating system
  - `config.js` - API base URL (Render deployment)

## Key Features

### User Side (FindWorker tab)
1. **Text Search**: Type problem → Gemini API classifies → Show nearby workers
2. **Voice Search**: Hold mic → Audio sent to Gemini → Transcription + classification + workers
3. **Worker Cards**: Show rating, category, distance, jobs done, contact buttons
4. **Worker Modal**: Detailed profile with Call/WhatsApp buttons + Rate option
5. **Suggestions**: Quick chips for common problems

### Worker Side (I'm a Worker tab)
1. **Registration**: Name + phone + Aadhaar (optional) + skills selection
2. **Dashboard**: Profile stats, availability toggle per skill, mock incoming requests
3. **Rating System**: Workers get rated 1-5 stars by users

## API Routes (Backend)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/search` | Text search: classify problem → return workers |
| POST | `/api/voice-search` | Voice search: transcribe audio → classify → return workers |
| POST | `/api/worker/register` | New worker registration |
| GET | `/api/worker/:id` | Get worker profile + reviews |
| PUT | `/api/worker/:id/availability` | Toggle online/offline status |
| POST | `/api/worker/:id/rate` | Submit rating for worker |
| GET | `/api/workers` | Get all workers (or filter by phone) |

## Data

### Mock Workers (20 workers)
- **Categories**: Plumber, Electrician, Carpenter, AC Mechanic, Painter, Cleaner, JCB Operator, Mason, Welder, Pest Control, Tractor Operator, Appliance Repair, Gardener, Auto Mechanic
- **Location**: Hyderabad center (Lat: 17.385, Lng: 78.487) with random offsets
- **Stored**: In-memory only (no DB persistence currently)

### Classification Keywords
- **Smart Fallback**: 14 categories with English + Hindi/transliteration keywords
- **Phrase Matching**: Highest weight (3 points)
- **Keyword Matching**: 1-2 points based on word type

## Environment Setup

### Backend Dependencies
```json
{
  "express": "^5.2.1",
  "cors": "^2.8.6",
  "@google/genai": "^1.46.0",
  "mongoose": "^9.3.3",
  "multer": "^2.1.1",
  "dotenv": "^17.3.1"
}
```

### Frontend Dependencies
```json
{
  "react": "19.1.0",
  "react-native": "0.81.5",
  "expo": "~54.0.0",
  "@react-navigation/native-stack": "^7.14.10",
  "@react-navigation/bottom-tabs": "^7.15.9"
}
```

### Environment Variables (`.env`)
- `PORT=5000`
- `GEMINI_API_KEY=AIzaSyCW7FETDfCr2S__0uhgfSYWLf1rwmqCLu4`
- `MONGODB_URI=mongodb://...` (not used in prototype)

## Location & Coordinates
- **Center**: Hyderabad (17.3850°N, 78.4867°E)
- **Mock Distance**: Randomly generated (0.5-4.5 km)
- **Note**: Distance filtering disabled in prototype (TODO for production)

## Important Notes
- **In-memory data**: No persistence between server restarts
- **Rate limiting**: Gemini API has fallback to smart classifier when limit hit
- **Distance simulation**: Not using Haversine formula in results (mock only)
- **Frontend deployment**: API points to https://local-fix.onrender.com (Render)
- **Credentials exposure**: API keys visible in .env file (should be hidden for production)
