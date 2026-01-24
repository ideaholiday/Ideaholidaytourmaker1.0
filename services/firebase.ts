
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';

// Configuration provided previously
const firebaseConfig = {
  apiKey: "AIzaSyBGCvWFm7hoWVPWWx-j5XtVV8mSYYa1chE",
  authDomain: "ideaholidaytourmaker.firebaseapp.com",
  projectId: "ideaholidaytourmaker",
  storageBucket: "ideaholidaytourmaker.firebasestorage.app",
  messagingSenderId: "468639922528",
  appId: "1:468639922528:web:e1d86abd4ff170f1338605",
  measurementId: "G-6GN21V2W4J"
};

// 1. Initialize App
const app = initializeApp(firebaseConfig);

// 2. Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 3. Initialize Firestore with Cache Settings
// We use CACHE_SIZE_UNLIMITED to maximize offline capability and speed
initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

export const db = getFirestore(app);

// 4. Enable Offline Persistence
// This is critical for "Speeding and Costing". 
// It reads from local IDB first, avoiding cloud reads ($$$) and network latency.
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence not supported by browser');
    }
});
