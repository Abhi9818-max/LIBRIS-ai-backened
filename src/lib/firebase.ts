import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig).filter(([, value]) => !value);

if (missingConfig.length > 0 && typeof window !== 'undefined') {
    const errorMessage = `
    Firebase configuration is missing!
    -----------------------------------
    The following environment variables are not set:
    ${missingConfig.map(([key]) => key).join('\n')}
    
    Please create a .env.local file in the root of your project and add your Firebase project's credentials to it.
    You can find these in your Firebase project's settings page (Project settings > General > Your apps > Web app).
    
    Example .env.local:
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=1:...
    
    IMPORTANT: Getting these credentials is free on Firebase's "Spark Plan". After creating the file, you must restart your development server.
    `;
    
    // We can't throw an error here on the server-side during build, as env vars might not be available yet.
    // Instead, we let the application start and the logic on the page will guide the user.
    // However, for client-side execution, we can provide this helpful guide.
    console.error(errorMessage);
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, firebaseConfig, missingConfig };
