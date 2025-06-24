import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// The following are not needed for basic auth functionality, so they are not included
// in the initial setup check.
// import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// We only check for the keys required for auth to avoid noisy console errors for new users.
const requiredConfigForAuth = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
}
const missingConfig = Object.entries(requiredConfigForAuth).filter(([, value]) => !value);

if (missingConfig.length > 0 && typeof window !== 'undefined') {
    const errorMessage = `
    Firebase configuration is missing!
    -----------------------------------
    The following environment variables are not set:
    ${missingConfig.map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join('\n')}
    
    Please create a .env.local file in the root of your project and add your Firebase project's credentials to it.
    You can find these in your Firebase project's settings page (Project settings > General > Your apps > Web app).
    
    Example .env.local:
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_APP_ID=1:...
    
    IMPORTANT: Getting these credentials is free on Firebase's "Spark Plan". After creating the file, you must restart your development server.
    `;
    
    console.error(errorMessage);
}


// Initialize Firebase with the full config, so other services work if configured.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const storage = firebaseConfig.storageBucket ? getStorage(app) : null;
// const db = getFirestore(app);

export { app, auth, storage, firebaseConfig, missingConfig };
