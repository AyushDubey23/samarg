const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Auto-configure for local emulator if not explicitly running on production
if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('No emulator host set, defaulting to localhost:8080 for Firestore.');
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

try {
  admin.initializeApp({
    projectId: 'samarg-7be68'
  });
} catch (e) {
  console.log('Admin SDK already initialized or failed, trying default initialization...');
  admin.initializeApp();
}

const db = admin.firestore();

const seedFile = path.join(__dirname, '../data/players.seed.json');

async function seed() {
  if (!fs.existsSync(seedFile)) {
    console.error('Error: players.seed.json not found! Run buildPlayerDb.js first.');
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const players = seedData.players;
  const squads = seedData.squads;

  console.log(`Found ${players.length} players and ${Object.keys(squads).length} squads in seed data.`);

  // Upload Players in batches of 400
  console.log('Uploading players to Firestore...');
  let batch = db.batch();
  let count = 0;

  for (const player of players) {
    const docRef = db.collection('players').doc(player.id);
    batch.set(docRef, player);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`  Uploaded ${count} players...`);
      batch = db.batch();
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
    console.log(`  Uploaded ${count} players.`);
  }

  // Upload Squads in batches
  console.log('Uploading squads to Firestore...');
  batch = db.batch();
  count = 0;

  for (const [squadId, squad] of Object.entries(squads)) {
    const docRef = db.collection('squads').doc(squadId);
    batch.set(docRef, squad);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`  Uploaded ${count} squads...`);
      batch = db.batch();
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
    console.log(`  Uploaded ${count} squads.`);
  }

  console.log('Database seeding successfully finished!');
}

seed().catch(err => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
