import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const getFirebaseConfig = () => {
  // Support custom injected config or environment variables
  if (typeof (globalThis as any).__firebase_config !== 'undefined') {
    const cfg = (globalThis as any).__firebase_config;
    if (typeof cfg === 'string') {
      try {
        return JSON.parse(cfg);
      } catch (e) {
        console.error("Gagal parse __firebase_config:", e);
      }
    } else if (typeof cfg === 'object') {
      return cfg;
    }
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForFallback",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "golden-gang-app.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "golden-gang-app",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "golden-gang-app.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef"
  };
};

const firebaseConfig = getFirebaseConfig();
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const appId = typeof (globalThis as any).__app_id !== 'undefined' 
  ? (globalThis as any).__app_id 
  : (process.env.NEXT_PUBLIC_APP_ID || 'golden-gang-app');

export const getBasePath = (colName: string) => `artifacts/${appId}/public/data/${colName}`;
export const USERS_PATH = getBasePath('users');
export const ITEMS_PATH = getBasePath('items');
export const TX_PATH = getBasePath('transactions');
export const STATS_PATH = getBasePath('stats');

export const formatMoney = (amount: number | string | undefined | null): string => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(Number(amount) || 0);
};
