import { auth } from "../firebase/config"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "../firebase/config"

export interface SubjectElo {
  math: number
  bahasa: number
  english: number
}

export interface UserProfile {
  id: string
  username: string
  email: string
  elo: SubjectElo
  preferredSubject?: keyof SubjectElo
  placementTestCompleted: boolean
  createdAt: Date
}

export const createUser = async (email: string, password: string, username: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      id: user.uid,
      username,
      email: user.email!,
      elo: {
        math: 400,
        bahasa: 400,
        english: 400
      },
      placementTestCompleted: false,
      createdAt: new Date(),
    }

    await setDoc(doc(db, "users", user.uid), userProfile)

    return { user, profile: userProfile }
  } catch (error) {
    throw error
  }
}

export const signInUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error) {
    throw error
  }
}

export const signOutUser = async () => {
  try {
    await signOut(auth)
  } catch (error) {
    throw error
  }
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
      } as UserProfile
    }
    return null
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

export const updateUserEloAfterPlacementTest = async (
  uid: string, 
  subjectScores: { math: number; bahasa: number; english: number }
): Promise<void> => {
  try {
    // Calculate ELO based on score for each subject (0-400 possible points per subject)
    const calculateElo = (score: number): number => {
      if (score >= 300) return 800      // Expert level (75%+ correct)
      else if (score >= 200) return 700  // Advanced level (50%+ correct) 
      else if (score >= 100) return 600  // Intermediate level (25%+ correct)
      else if (score >= 50) return 500   // Beginner+ level (12.5%+ correct)
      else return 400 // Beginner level
    }

    const elo: SubjectElo = {
      math: calculateElo(subjectScores.math),
      bahasa: calculateElo(subjectScores.bahasa),
      english: calculateElo(subjectScores.english)
    }

    // Determine preferred subject based on highest score
    const preferredSubject: keyof SubjectElo = Object.keys(subjectScores).reduce((a, b) => 
      subjectScores[a as keyof typeof subjectScores] > subjectScores[b as keyof typeof subjectScores] ? a : b
    ) as keyof SubjectElo

    const userRef = doc(db, "users", uid)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile
      
      await setDoc(userRef, {
        ...userData,
        elo,
        preferredSubject,
        placementTestCompleted: true
      }, { merge: true })
    } else {
      throw new Error("User document not found")
    }
  } catch (error) {
    console.error("Error updating user ELO:", error)
    throw error
  }
}
