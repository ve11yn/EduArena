import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Check if required environment variables are present
const requiredEnvVars = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
}

// Validate environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0) {
  console.error('❌ Missing Firebase Admin environment variables:', missingVars)
  console.error('📋 Please set the following environment variables in .env.local:')
  console.error('   - FIREBASE_PROJECT_ID')
  console.error('   - FIREBASE_CLIENT_EMAIL') 
  console.error('   - FIREBASE_PRIVATE_KEY')
  console.error('💡 See .env.local.example for the template')
  
  // In development, we can create a mock setup to prevent crashes
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Running in development mode with mock Firebase Admin (APIs will not work)')
  } else {
    throw new Error(`Missing required Firebase Admin environment variables: ${missingVars.join(', ')}`)
  }
}

let adminApp: any = null
let adminAuth: any = null
let adminDb: any = null

try {
  const firebaseAdminConfig = {
    credential: cert({
      projectId: requiredEnvVars.projectId || 'mock-project',
      clientEmail: requiredEnvVars.clientEmail || 'mock@mock.com',
      privateKey: requiredEnvVars.privateKey?.replace(/\\n/g, "\n") || 'mock-key',
    }),
  }

  // Initialize Firebase Admin
  adminApp = getApps().length === 0 ? initializeApp(firebaseAdminConfig, "admin") : getApps()[0]
  adminAuth = getAuth(adminApp)
  adminDb = getFirestore(adminApp)
  
  console.log('✅ Firebase Admin initialized successfully')
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error)
  
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Creating mock Firebase Admin for development')
    // Create mock objects to prevent crashes during development
    adminAuth = {
      verifyIdToken: () => Promise.reject(new Error('Firebase Admin not configured')),
      createUser: () => Promise.reject(new Error('Firebase Admin not configured')),
    }
    adminDb = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.reject(new Error('Firebase Admin not configured')),
          set: () => Promise.reject(new Error('Firebase Admin not configured')),
          update: () => Promise.reject(new Error('Firebase Admin not configured')),
        })
      })
    }
  } else {
    throw error
  }
}

export { adminAuth, adminDb }
export default adminApp
