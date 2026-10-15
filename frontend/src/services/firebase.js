import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDKj1DF99nOv6YPjKSYw3mOVlGNoIoAfcw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'projeto-final-arandue.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'projeto-final-arandue',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'projeto-final-arandue.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1084089085404',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1084089085404:web:d5e4eb169311f8deba3319',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-VFQVW9BLCT',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export { app, auth, googleProvider };
