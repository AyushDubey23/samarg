import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const firebaseConfig = {
  apiKey: "AIzaSyDYGKm3iQi6OZZgRaXAtfdUMCdwgKGPzuU",
  authDomain: "samarg-7be68.firebaseapp.com",
  projectId: "samarg-7be68",
  databaseURL: isLocal
    ? "http://127.0.0.1:9000?ns=samarg-7be68"
    : "https://samarg-7be68-default-rtdb.firebaseio.com",
  storageBucket: "samarg-7be68.firebasestorage.app",
  messagingSenderId: "1085191434729",
  appId: "1:1085191434729:web:91d4ae0ed2679569149b78",
  measurementId: "G-DSSQWVB7N7"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Products
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const rtdb = getDatabase(app);

// Automatically connect to Local Emulators if running locally
if (isLocal) {
  console.log("Local development environment detected. Wiring up Firebase Emulators.");
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
    connectDatabaseEmulator(rtdb, "localhost", 9000);
  } catch (e) {
    console.warn("Emulator connection warning (already connected?):", e);
  }
}

export { app, auth, db, functions, rtdb };
