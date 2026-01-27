import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAQRSSRAsSPtsVxDJ8bbUErTXKTEeeB9xA",
  authDomain: "schedule-checker-b0eb7.firebaseapp.com",
  projectId: "schedule-checker-b0eb7",
  storageBucket: "schedule-checker-b0eb7.firebasestorage.app",
  messagingSenderId: "1019544248079",
  appId: "1:1019544248079:web:3e7849c0555eb6f2c0e87a",
  measurementId: "G-7S88WZQ3D4"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 데이터베이스
export const db = getFirestore(app);

// Auth (필요시 사용)
export const auth = getAuth(app);

export default app;
