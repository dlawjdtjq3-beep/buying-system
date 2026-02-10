import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 환경 변수 확인 (디버깅용)
if (typeof window !== 'undefined') {
  console.log('🔥 Firebase 설정 상태:', {
    apiKey: firebaseConfig.apiKey ? '✅ 설정됨' : '❌ 없음',
    projectId: firebaseConfig.projectId || '❌ 없음',
  });
}

// Firebase 앱 초기화 (중복 초기화 방지)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { app, db };
