import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDMHYC9xmYGoRgAIZ4gKmgAA-Uu0HsF6zs",
  authDomain: "summarist-a46d4.firebaseapp.com",
  projectId: "summarist-a46d4",
  storageBucket: "summarist-a46d4.firebasestorage.app",
  messagingSenderId: "132030785826",
  appId: "1:132030785826:web:a28b97354e1969ebf01d7b",
  measurementId: "G-1XHEBN71N9",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;
