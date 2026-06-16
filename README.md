# Local Cricket Match Finder & Organizer (MERN Stack)

A production-ready full-stack web application designed to help players discover, create, join, and manage local cricket matches in their city. Eliminates the friction of finding players, organizing team rosters, tracking match scores, and coordinating real-time chats.

## 🚀 Features

- **Passwordless OTP Email Sign In**: Cryptographically hashed 6-digit OTP verification with automatic resend coodowns (Nodemailer + console fallbacks).
- **Social Login Bypass**: Quick developer mock bypass buttons for Google and GitHub accounts.
- **Geospatial Match & Player Search**: Utilizes MongoDB `$nearSphere` 2dsphere indexing to locate matches or players within a specific kilometer radius from coordinates.
- **Interactive Pitch Maps**: OpenStreetMap (OSM) integration via Leaflet for pinpointing pitch/ground venues.
- **Real-Time Match Chat**: Live chat room and system alerts (join/leave events) synced via Socket.io.
- **Attendance Tracker**: Organize rosters, confirm presence (Present / Absent), and dynamically update career attendance rates.
- **Post-Match Stats & Scorecard**: Log winning teams, total scores, MVP selections, and player runs/wickets to instantly update profile batting averages and strike rates.
- **Teammate Rating System**: Rate matches participants on Sportsmanship, Skill, Teamwork, and Punctuality.
- **Admin Command Center**: Analytic dashboards for telemetry, banning users, deleting spam, and resolving reports.
- **Helmet, CORS, Mongo Sanitize & Rate Limiting** security.

---

## 🛠️ Installation & Setup

> [!TIP]
> **Active Workspace Recommendation**
> For the best editing and code navigation experience, please open this subdirectory as your active workspace:
> `/Users/vishalrajrawani/.gemini/antigravity/scratch/cricket-match-finder`

### 1. Database Setup
Make sure MongoDB is running on your machine:
```bash
# If using brew
brew services start mongodb-community
```

### 2. Backend Setup
Navigate to the `backend/` directory:
```bash
cd backend
# Install dependencies
npm install

# Setup env parameters
cp .env.example .env
```
Ensure your `.env` contains:
```env
PORT=5005
MONGODB_URI=mongodb://127.0.0.1:27017/cricket-finder
JWT_SECRET=supersecret_access_token_key_123456
JWT_REFRESH_SECRET=supersecret_refresh_token_key_123456
FRONTEND_URL=http://localhost:5174
```
Start the development server:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate to the `frontend/` directory:
```bash
cd ../frontend
# Install dependencies
npm install --legacy-peer-deps
```
Start the client application:
```bash
npm run dev
```
Open [http://localhost:5174](http://localhost:5174) in your browser.

---

## 🧪 Development & Verification

### Run Integration Tests
We have built a database verification and authentication test script. To run it:
```bash
cd backend
npm test
```
*Note: Make sure your local MongoDB instance is active before running tests.*
