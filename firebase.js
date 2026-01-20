// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Safe AsyncStorage import - removed since it's not used in this file

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPyTC1B3bM14a7OcCaTSnKebKOh1Ntt-Y",
  authDomain: "campulse-8c50e.firebaseapp.com",
  projectId: "campulse-8c50e",
  storageBucket: "campulse-8c50e.appspot.com",
  messagingSenderId: "244725080770",
  appId: "1:244725080770:web:9ab35ae367ffecbf92515b",
  measurementId: "G-T4GWKP6WKQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with persistent cache for React Native
// This enables automatic offline queueing and background sync
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const storage = getStorage(app);

console.log('Firebase initialized with persistent cache for React Native');

export { auth, db, storage };