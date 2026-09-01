import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const firebaseEnvironment = import.meta.env.VITE_FIREBASE_ENV;
const expectedProjectId = import.meta.env.DEV
  ? 'chronolog-dev'
  : 'chronolog-f21f6';
const expectedEnvironment = import.meta.env.DEV
  ? 'development'
  : 'production';

if (
  firebaseEnvironment !== expectedEnvironment ||
  firebaseConfig.projectId !== expectedProjectId
) {
  throw new Error(
    `Firebase environment mismatch: expected ${expectedEnvironment}/${expectedProjectId}, received ${firebaseEnvironment}/${firebaseConfig.projectId}.`
  );
}

if (import.meta.env.DEV) {
  console.info('[Chronolog DEV] Firebase project:', firebaseConfig.projectId);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  console.warn('Firestore persistent cache unavailable; using the SDK fallback cache.', error);
  firestore = getFirestore(app);
}
export const db = firestore;
