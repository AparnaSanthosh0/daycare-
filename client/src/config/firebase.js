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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default firebase;