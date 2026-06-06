import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_FIREBASE_API_KEY. Copy .env.local.example to .env.local and fill in your Firebase credentials.'
    );
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// Lazy singleton — only initialised on first call, not at module evaluation time
let _auth: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}

export default getFirebaseApp;
