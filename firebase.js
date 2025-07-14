// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const db = getFirestore(app);

export { app, auth, db };