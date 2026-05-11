import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

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

// Cambia el estado de actividad del usuario
export async function setUserActiveStatus(uid, isActive) {
  if (!uid) return;
  try {

    await setDoc(
      doc(db, "users", uid),
      {
        isActive,
        lastSeen: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    console.error("Error actualizando estado de usuario:", e);
  }
}
