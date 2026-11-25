export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dbms-907bf.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dbms-907bf',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dbms-907bf.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '319707277301',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:319707277301:web:demo',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

export const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
export const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
