import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBciNnS-jUpSiVqLDhYOVGKXgWaePdKQgw",
  authDomain: "eduarena-53c53.firebaseapp.com",
  projectId: "eduarena-53c53",
  storageBucket: "eduarena-53c53.firebasestorage.app",
  messagingSenderId: "686166138787",
  appId: "1:686166138787:web:d1cc39577c60eed3b4c416",
  measurementId: "G-31KVV9YZPL"
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

export default app
