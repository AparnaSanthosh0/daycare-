// Firebase client initialization
// Make sure to fill the corresponding values in client/.env
// Required env vars (prefixed with REACT_APP_):
// - REACT_APP_FIREBASE_API_KEY
// - REACT_APP_FIREBASE_AUTH_DOMAIN
// - REACT_APP_FIREBASE_PROJECT_ID
// - REACT_APP_FIREBASE_APP_ID
// - (Optional) REACT_APP_FIREBASE_MESSAGING_SENDER_ID
// - (Optional) REACT_APP_FIREBASE_STORAGE_BUCKET

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
};

// Validate Firebase configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error('❌ Firebase configuration incomplete. Missing:', missingKeys);
  console.error('Please set the following environment variables in Vercel:');
  missingKeys.forEach(key => {
    console.error(`- REACT_APP_FIREBASE_${key.toUpperCase()}`);
  });
}

// Only initialize Firebase if configuration is complete
if (!firebase.apps.length && missingKeys.length === 0) {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully');
} else if (missingKeys.length > 0) {
  console.warn('⚠️ Firebase not initialized due to missing configuration');
}

export default firebase;