import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace these values with the real ones from your Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDNzranJSj48ldtVdIn_cI-Lff2C9OFJmQ",
  authDomain: "form-builder-fe7b3.firebaseapp.com",
  projectId: "form-builder-fe7b3",
  storageBucket: "form-builder-fe7b3.firebasestorage.app",
  messagingSenderId: "365445020038",
  appId: "1:365445020038:web:2356d28179a31b86069407"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the Auth and Database services so we can use them in other files
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;
