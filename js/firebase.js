/**
 * Gold Crochet — Módulo Central do Firebase (SDK v10 Modular)
 * Gerencia autenticação resiliente (Google Sign-In, Email/Senha) e Firestore com tolerância a falhas.
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
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
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
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
  getDocFromServer,
  onSnapshot,
  orderBy,
  limit,
  increment,
  arrayUnion,
  arrayRemove,
  runTransaction,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração principal da plataforma Gold Crochet
export const firebaseConfig = {
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

// Inicialização segura do App Firebase
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Analytics
export let analytics = null;
try {
  if (typeof window !== 'undefined') analytics = getAnalytics(app);
} catch (e) {
  // Ignorado em ambientes sem suporte
}

// Inicialização do Auth com persistência no navegador
export const auth = getAuth(app);
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch (e) {}

// Provedor Google configurado com prompt de seleção de conta
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Inicialização resiliente do Firestore (suporta banco nomeado e fallback default)
let dbInstance = null;
try {
  if (firebaseConfig.firestoreDatabaseId) {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }
} catch (err) {
  console.warn('[Firebase] Falha ao inicializar com firestoreDatabaseId customizado, usando padrão:', err);
  try {
    dbInstance = getFirestore(app);
  } catch (errDefault) {
    console.error('[Firebase] Falha crítica no Firestore:', errDefault);
  }
}
export const db = dbInstance;

// Helper de log e tratamento de erros do Firestore
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
  console.warn('[Firestore Operação]:', operationType, path, errInfo.error);
  return errInfo;
}

// Teste de conexão não bloqueante
(async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(fsDoc(db, 'test', 'connection'));
    console.log('✨ [Firebase] Conexão com Firestore confirmada e ativa!');
  } catch (error) {
    // Falha silenciosa para não travar a UI em caso de regras restritas ou offline
    if (error && error.code !== 'permission-denied') {
      console.info('[Firebase] Status da rede:', error.message || 'Offline');
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
  fsWhere as where,
  getDocs,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit,
  increment,
  arrayUnion,
  arrayRemove,
  runTransaction,
  writeBatch
};

if (typeof window !== 'undefined') {
  window.GoldFirebase = {
    app,
    auth,
    db,
    googleProvider,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
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
    serverTimestamp,
    onSnapshot,
    orderBy,
    limit,
    increment,
    arrayUnion,
    arrayRemove,
    runTransaction,
    writeBatch,
    handleFirestoreError
  };
}
