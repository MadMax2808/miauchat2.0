import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "miauchat-98a7f.firebaseapp.com",
  projectId: "miauchat-98a7f",
  storageBucket: "miauchat-98a7f.firebasestorage.app",
  messagingSenderId: "900647675673",
  appId: "1:900647675673:web:3821d2e642045401110788",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
