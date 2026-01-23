
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ------------------------------------------------------------------
// FIREBASE CONFIGURATION
// Project: Idea Holiday Tour Maker (Production)
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBGCvWFm7hoWVPWWx-j5XtVV8mSYYa1chE",
  authDomain: "b2b.ideaholiday.com", 
  projectId: "ideaholidaytourmaker",
  storageBucket: "ideaholidaytourmaker.firebasestorage.app",
  messagingSenderId: "468639922528",
  appId: "1:468639922528:web:e1d86abd4ff170f1338605",
  measurementId: "G-6GN21V2W4J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configure language to match device language
auth.useDeviceLanguage();

export { auth, db };
