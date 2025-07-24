import { auth } from "../firebase/config"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
} from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"
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
        math: 0,
        bahasa: 0,
        english: 0
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

// Update user profile functions
export const updateUserProfile = async (userId: string, updates: { username?: string }) => {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, updates)
    console.log("✅ User profile updated successfully")
  } catch (error) {
    console.error("❌ Error updating user profile:", error)
    throw error
  }
}

export const updateUserEmail = async (currentPassword: string, newEmail: string) => {
  try {
    const user = auth.currentUser
    if (!user || !user.email) {
      throw new Error("No authenticated user found")
    }

    // Re-authenticate user before changing email
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)

    // Update email in Firebase Auth
    await updateEmail(user, newEmail)

    // Update email in Firestore
    const userRef = doc(db, "users", user.uid)
    await updateDoc(userRef, { email: newEmail })

    console.log("✅ Email updated successfully")
  } catch (error) {
    console.error("❌ Error updating email:", error)
    throw error
  }
}

export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
  try {
    const user = auth.currentUser
    if (!user || !user.email) {
      throw new Error("No authenticated user found")
    }

    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)

    // Update password in Firebase Auth
    await updatePassword(user, newPassword)

    console.log("✅ Password updated successfully")
  } catch (error) {
    console.error("❌ Error updating password:", error)
    throw error
  }
}

export const updateUserEloAfterPlacementTest = async (
  uid: string, 
  subjectScores: { math: number; bahasa: number; english: number }
): Promise<void> => {
  try {
    const userRef = doc(db, "users", uid)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile
      
      // Check if user has already completed the placement test
      if (userData.placementTestCompleted) {
        console.warn("⚠️ User has already completed placement test, ignoring request")
        throw new Error("Placement test already completed")
      }
      
      // Calculate ELO based on score for each subject (0-400 possible points per subject)
      const calculateElo = (score: number): number => {
        if (score >= 300) return 800      // Expert level (75%+ correct)
        else if (score >= 200) return 600  // Intermediate level (50%+ correct) 
        else if (score >= 100) return 400  // Beginner+ level (25%+ correct)
        else if (score >= 50) return 200   // Novice level (12.5%+ correct)
        else return 100 // Beginner level (still better than 0)
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

      await setDoc(userRef, {
        ...userData,
        elo,
        preferredSubject,
        placementTestCompleted: true
      }, { merge: true })
      
      console.log("✅ Placement test completed and user profile updated")
    } else {
      throw new Error("User document not found")
    }
  } catch (error) {
    console.error("Error updating user ELO:", error)
    throw error
  }
}
