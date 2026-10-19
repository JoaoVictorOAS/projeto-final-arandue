import { initializeApp, getApps, getApp } from 'firebase/app';
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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let _authInstance = null;
function getFirebaseAuth() {
  if (!_authInstance) {
    try {
      _authInstance = getAuth(app);
    } catch (err) {
      console.warn('[Firebase] Inicialização de Auth deferred:', err?.message);
      _authInstance = getAuth(app);
    }
  }
  return _authInstance;
}

try {
  _authInstance = getAuth(app);
} catch {
  // Ignora se o módulo ainda estiver completando o registro de componentes
}

const auth = new Proxy({}, {
  get(target, prop) {
    const instance = getFirebaseAuth();
    if (!instance) return undefined;
    const val = Reflect.get(instance, prop);
    return typeof val === 'function' ? val.bind(instance) : val;
  },
  has(target, prop) {
    const instance = getFirebaseAuth();
    return instance ? Reflect.has(instance, prop) : false;
  },
});

let _googleProvider = null;
function getGoogleProvider() {
  if (!_googleProvider) {
    _googleProvider = new GoogleAuthProvider();
    _googleProvider.setCustomParameters({
      prompt: 'select_account',
      hl: 'pt-BR',
    });
  }
  return _googleProvider;
}

const googleProvider = new Proxy({}, {
  get(target, prop) {
    const instance = getGoogleProvider();
    if (!instance) return undefined;
    const val = Reflect.get(instance, prop);
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});

export { app, auth, googleProvider, getFirebaseAuth, getGoogleProvider };
