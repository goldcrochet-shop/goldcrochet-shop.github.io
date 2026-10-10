// Gold Crochet - Módulo Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc as fsDoc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection as fsCollection,
  addDoc,
  query as fsQuery,
  where as fsWhere,
  getDocs,
  serverTimestamp,
  getDocFromServer
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  projectId: "lucky-dolphin-861jg",
  appId: "1:422090938662:web:2c55e62c1f7ad7a85f49e7",
  apiKey: "AIzaSyDHHGEuFeQViQutklqIhFoEI5akvAv4Ko8",
  authDomain: "lucky-dolphin-861jg.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-goldcrochetshop-0e84b9ac-6dbb-400f-9959-fc455c1c4776",
  storageBucket: "lucky-dolphin-861jg.firebasestorage.app",
  messagingSenderId: "422090938662",
  measurementId: "",
  oAuthClientId: "422090938662-vtlg1dv2hd0u60hagkpvl9plg8cfpgi5.apps.googleusercontent.com"
};

export const app = initializeApp(firebaseConfig);
export let analytics = null;
try { analytics = getAnalytics(app); } catch (e) {}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Error logging helper
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo));
  return errInfo;
}

// Test connection
(async function testConnection() {
  try {
    await getDocFromServer(fsDoc(db, 'test', 'connection'));
    console.log('[Firebase] Conexão com Firestore confirmada!');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Verifique as configurações de rede/Firebase.');
    }
  }
})();

export {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
  signInWithPopup,
  fsDoc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  fsCollection,
  addDoc,
  fsQuery,
  fsWhere,
  getDocs,
  serverTimestamp
};
