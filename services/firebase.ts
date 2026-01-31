

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBGCvWFm7hoWVPWWx-j5XtVV8mSYYa1chE",
  authDomain: "ideaholidaytourmaker.firebaseapp.com",
  projectId: "ideaholidaytourmaker",
  storageBucket: "ideaholidaytourmaker.firebasestorage.app",
  messagingSenderId: "468639922528",
  appId: "1:468639922528:web:e1d86abd4ff170f1338605",
  measurementId: "G-6GN21V2W4J"
};

// 1. Singleton Initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. Log Configuration for Debugging
console.log(`[Firebase] Initialized. Project ID: ${firebaseConfig.projectId}`);

// 3. Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 4. Firestore (Native Mode, No Persistence)
// We use initializeFirestore to ensure settings are applied before any read/write
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true // Ensures better connectivity through corporate firewalls
});

// 5. Functions
export const functions = getFunctions(app);

export { db };
