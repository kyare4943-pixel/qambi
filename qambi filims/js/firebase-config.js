// =========================================================
// QAMBI FILIMS - FIREBASE CLOUD & AUTH CONFIGURATION
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  getDocs,
  query,
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase configuration for Qambi Filims
const firebaseConfig = {
  apiKey: "AIzaSyCun6drgZhR3v2nusIg6IRvGthBp1MuVMk",
  authDomain: "qambi-f7e85.firebaseapp.com",
  projectId: "qambi-f7e85",
  storageBucket: "qambi-f7e85.firebasestorage.app",
  messagingSenderId: "469160574578",
  appId: "1:469160574578:web:e9ba9f55e65c6929604ceb",
  measurementId: "G-D8W6HDDMH9"
};

// Initialize Firebase App & Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Analytics initialization if supported
isSupported().then(supported => {
  if (supported) {
    const analytics = getAnalytics(app);
    window.QAMBI_ANALYTICS = analytics;
  }
}).catch(() => {});

// Expose Firebase services to window for application logic
window.QAMBI_FIREBASE = {
  app,
  db,
  auth,
  // Firestore methods
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  // Auth methods
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  isReady: true
};

console.log("🔥 Qambi Filims: Firebase Database & Auth diyaar bay yihiin!");

// Notify app that Firebase is ready
window.dispatchEvent(new CustomEvent('firebase-ready', { detail: window.QAMBI_FIREBASE }));
if (window.QAMBI_APP) {
  if (typeof window.QAMBI_APP.initFirebase === 'function') {
    window.QAMBI_APP.initFirebase();
  }
  if (typeof window.QAMBI_APP.initFirebaseAuth === 'function') {
    window.QAMBI_APP.initFirebaseAuth();
  }
}
