# SAMARG - Cricket Draft & World Cup Simulator

SAMARG is a premium, browser-based cricket draft and World Cup simulator. It is a cricket-themed reinterpretation of the viral football game "7a0 (Sete a Zero)".

## Product Concept

1. **Scout & Draft**: The player drafts a Playing XI one cricketer at a time. Each "draw" pulls a random real national cricket squad from a specific historical tournament year (e.g., India 2011, Australia 2003, West Indies 1979). The player must select exactly one player from the squad to add to their XI into an open slot.
2. **Squad Validation**: The Playing XI must satisfy cricket role balance: exactly 11 players, at least one wicketkeeper, and at least 5 recognized bowling options.
3. **Simulate World Cup**: The player enters an 8-team round-robin league stage (7 rounds, each team plays all other teams once). Matches are simulated server-side ball-by-ball using a statistically grounded probabilistic engine driven by real historical statistics.
4. **Go Undefeated (7-0)**: The player's goal is to go undefeated (7 wins, 0 losses) to claim the Samarg Cup trophy.
5. **Share Card**: At the end of matches, players can render and download a stylized match card (exported to a PNG via HTML5 Canvas) to share on social media.

---

## Technical Stack

- **Frontend**: Plain HTML5, Vanilla CSS3 (custom CSS variables, mobile-first responsive grid), and Vanilla JS (ES6 modules).
- **Backend**: Firebase
  - **Firebase Authentication**: Anonymous logins by default to ensure zero-friction onboarding, with optional Google Sign-In linking to persist leaderboard achievements.
  - **Cloud Firestore**: Stores players, squads, user stats, campaign states, leagues, matches, and the global leaderboard.
  - **Firebase Hosting**: Deploys the Vite-minified static assets.
  - **Cloud Functions (2nd Gen, Node 20)**: Authoritative callable functions running the ball engine and validating submissions.
- **Build Tooling**: Vite (for local development server and asset minification).

---

## Directory Structure

```
samarg/
├── package.json               # Root scripts & dependencies (Vite, Jest)
├── vite.config.js             # Vite compiler config
├── firebase.json              # Firebase settings & emulator configurations
├── .firebaserc                # Active Firebase project link
├── firestore.rules            # Security rules for collections
├── firestore.indexes.json     # Leaderboard composite index rules
├── functions/                 # Cloud Functions (2nd gen) source
│   ├── index.js               # Functions endpoints
│   ├── engine/                # Shared Match Engine files
│   │   ├── ballEngine.js      # Main ball-by-ball simulator
│   │   ├── matchupModel.js    # Probabilistic matchup weighting
│   │   ├── commentaryBank.json# Procedural text templates
│   │   ├── dlsApprox.js       # Curved DLS rain calculations
│   │   ├── draftRules.js      # Squad validations
│   │   └── seededRng.js       # Mulberry32 PRNG
│   └── package.json
├── src/                       # Frontend application
│   ├── index.html             # Entry HTML
│   ├── styles/                # CSS variables, bases, layouts, component styles
│   └── scripts/               # Hash router, Firebase init, views
├── data/
│   └── players.seed.json      # Structured historical player data
├── scripts/
│   ├── buildPlayerDb.js       # Normalizes career stats from historical templates
│   └── seedFirestore.js       # Uploads seed data to Firestore / Emulator
├── docs/
│   └── rating-methodology.md  # Detailed calculations from stats to ratings
├── tests/                     # Jest Unit & Calibration Tests
└── README.md
```

---

## Setup and Running Locally

### 1. Prerequisites
- **Node.js**: Node 20 or higher installed.
- **Firebase CLI**: Installed globally (`npm install -g firebase-tools`).
- **Java Runtime Environment**: Required to run the local Firebase Emulator.

### 2. Installation
Install root dependencies and functions dependencies:
```bash
# Install root tools (Vite, Jest)
npm install

# Install functions tools
cd functions
npm install
cd ..
```

### 3. Generate Seed Data
Generate the normalized player database:
```bash
npm run build
```
This runs `scripts/buildPlayerDb.js` and writes the player database seed file to `data/players.seed.json`.

### 4. Start Firebase Emulators
Start the local Firebase Emulator Suite (Firestore, Functions, Auth, Hosting):
```bash
firebase emulators:start
```
Keep this running in one terminal window. The Emulator UI will be available at `http://localhost:4000`.

### 5. Seed the Database
In a new terminal window, upload the seed players and squads to the local emulator database:
```bash
npm run seed
```

### 6. Run the Frontend Development Server
Start Vite to run the web application locally:
```bash
npm run dev
```
Open the provided local URL (typically `http://localhost:3000`) in your browser to play!

---

## Testing

Run unit and calibration tests using Jest:
```bash
npm run test
```
The test suite validates:
1. **Draft rules**: Confirms it blocks Playing XIs lacking a wicketkeeper, containing less than 11 players, or having fewer than 5 bowling options.
2. **Calibration**: Simulates 10,000 deliveries and asserts that the resulting outcome percentages (dots, singles, boundaries, wickets, extras) fall within the calibrated thresholds defined in the game design rules.

---

## Simulation Mechanics & Normalization

Player ratings are computed programmatically from their actual tournament statistics.
- **Batting Average** influences overall capability and `temperamentConsistency` (lower averages result in more bimodal boom/bust cycles).
- **Strike Rate** maps to `powerHittingRating`, which dynamically weights the probability of hitting fours and sixes (especially in death overs).
- **Bowling Economy & Strike Rate** map to `economyRate` and `wicketTakingRating`, which determine bowler effectiveness in matchups.
- **T20 Phase Rules**:
  - *Powerplay (Overs 1-6)*: Field restrictions boost boundary rates.
  - *Middle Overs (Overs 7-15)*: Containment spinner-friendly, favors strike rotation.
  - *Death Overs (Overs 16-20)*: High aggression bimodal phase. Increased dot probability and boundary rates simultaneously.
- **Chase pressure**: Required Run Rate in the 2nd Innings scales the batting team's risk multiplier. High RRR boosts boundary rates but increases wickets exponentially.
- **Simplified DLS**: Adjusts the target score for rain delays using a curve that maps wickets lost and remaining overs to resource percentages.
