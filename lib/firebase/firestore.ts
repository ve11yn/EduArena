import { db } from "./config"
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
} from "firebase/firestore"
import type { SubjectElo } from "./auth"

export type { SubjectElo } from "./auth"

export interface User {
  id: string
  username: string
  email: string
  elo: SubjectElo
  preferredSubject?: keyof SubjectElo
  placementTestCompleted: boolean
  createdAt: Date
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation?: string
}



export interface Duel {
  id: string
  player1Id: string
  player2Id?: string
  subject: keyof SubjectElo
  difficulty?: string // Optional for PvP
  quizData?: QuizQuestion[] // Array of questions
  currentQuestionIndex: number
  player1Answers?: string[]
  player2Answers?: string[]
  player1Time?: number[]
  player2Time?: number[] 
  player1Score: number
  player2Score: number
  winnerId?: string
  status: "waiting" | "in_progress" | "completed" | "cancelled"
  isTraining?: boolean
  maxQuestions: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface DuelWithUsers extends Duel {
  player1: User
  player2?: User | null
}

// Users collection operations
export const createUserProfile = async (uid: string, userData: Omit<User, "id">) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      ...userData,
      createdAt: Timestamp.fromDate(userData.createdAt),
    })
  } catch (error) {
    throw error
  }
}

export const getUserById = async (uid: string): Promise<User | null> => {
  try {
    // Handle bot users
    if (uid.startsWith("bot_")) {
      const difficulty = uid.replace("bot_", "") as "beginner" | "intermediate" | "advanced"
      const botElos = { beginner: 450, intermediate: 650, advanced: 850 }
      const botNames = { beginner: "ROOKIE_BOT", intermediate: "WARRIOR_BOT", advanced: "MASTER_BOT" }

      return {
        id: uid,
        username: botNames[difficulty],
        email: `${uid}@bot.local`,
        elo: {
          math: botElos[difficulty],
          bahasa: botElos[difficulty],
          english: botElos[difficulty],
        },
        placementTestCompleted: true,
        createdAt: new Date(),
      }
    }

    const userDoc = await getDoc(doc(db, "users", uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      
      // Handle createdAt conversion with fallback
      let createdAt: Date
      try {
        createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      } catch (dateError) {
        console.warn(`⚠️ Error converting createdAt for user ${uid}:`, dateError)
        createdAt = new Date() // Fallback to current date
      }
      
      // Ensure ELO structure exists with defaults
      const elo = {
        math: typeof data.elo?.math === 'number' ? data.elo.math : 0,
        bahasa: typeof data.elo?.bahasa === 'number' ? data.elo.bahasa : 0,
        english: typeof data.elo?.english === 'number' ? data.elo.english : 0,
      }
      
      return {
        id: userDoc.id,
        username: data.username || `user_${uid}`,
        email: data.email || '',
        elo,
        preferredSubject: data.preferredSubject,
        placementTestCompleted: Boolean(data.placementTestCompleted),
        createdAt,
      } as User
    }
    return null
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(usersQuery)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as User
    })
  } catch (error) {
    console.error("Error getting users:", error)
    return []
  }
}

export const updateUserElo = async (uid: string, subject: keyof SubjectElo, newElo: number) => {
  try {
    const userRef = doc(db, "users", uid)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const userData = userDoc.data() as User
      const updatedElo = { ...userData.elo, [subject]: newElo }
      await updateDoc(userRef, { elo: updatedElo })
    }
  } catch (error) {
    throw error
  }
}

// Duels collection operations
export const createDuel = async (duelData: Omit<Duel, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, "duels"), {
      ...duelData,
      createdAt: Timestamp.now(),
      startedAt: duelData.startedAt ? Timestamp.fromDate(duelData.startedAt) : null,
      completedAt: duelData.completedAt ? Timestamp.fromDate(duelData.completedAt) : null,
    })
    return docRef.id
  } catch (error) {
    throw error
  }
}

export const getDuelById = async (duelId: string): Promise<Duel | null> => {
  try {
    const duelDoc = await getDoc(doc(db, "duels", duelId))
    if (duelDoc.exists()) {
      const data = duelDoc.data()
      return {
        id: duelDoc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as Duel
    }
    return null
  } catch (error) {
    console.error("Error getting duel:", error)
    return null
  }
}

export const getDuelWithUsers = async (duelId: string): Promise<DuelWithUsers | null> => {
  try {
    const duel = await getDuelById(duelId)
    if (!duel) return null

    const player1 = await getUserById(duel.player1Id)
    const player2 = duel.player2Id ? await getUserById(duel.player2Id) : undefined

    if (!player1) return null

    return {
      ...duel,
      player1,
      player2,
    }
  } catch (error) {
    console.error("Error getting duel with users:", error)
    return null
  }
}

export const findWaitingDuel = async (subject: keyof SubjectElo, currentUserId: string, userElo: number) => {
  try {
    const duelsQuery = query(
      collection(db, "duels"),
      where("status", "==", "waiting"),
      where("subject", "==", subject),
      where("isTraining", "==", false),
      orderBy("createdAt", "asc"),
    )

    const querySnapshot = await getDocs(duelsQuery)
    let bestMatch = null
    let smallestEloDiff = Number.POSITIVE_INFINITY

    for (const docSnapshot of querySnapshot.docs) {
      const duelData = docSnapshot.data()
      if (duelData.player1Id === currentUserId) continue

      // Get player1 data to check ELO for the specific subject
      const player1 = await getUserById(duelData.player1Id)
      if (player1) {
        const player1Elo = getUserEloForSubject(player1.elo, subject)
        const eloDiff = Math.abs(player1Elo - userElo)

        // Find the closest ELO match
        if (eloDiff < smallestEloDiff) {
          smallestEloDiff = eloDiff
          bestMatch = {
            id: docSnapshot.id,
            ...duelData,
            createdAt: duelData.createdAt.toDate(),
          } as Duel
        }
      }
    }

    return bestMatch
  } catch (error) {
    console.error("Error finding waiting duel:", error)
    return null
  }
}

export const updateDuel = async (duelId: string, updates: Partial<Duel>) => {
  try {
    const updateData: any = { ...updates }

    // Convert Date objects to Timestamps
    if (updates.startedAt) {
      updateData.startedAt = Timestamp.fromDate(updates.startedAt)
    }
    if (updates.completedAt) {
      updateData.completedAt = Timestamp.fromDate(updates.completedAt)
    }

    await updateDoc(doc(db, "duels", duelId), updateData)
  } catch (error) {
    throw error
  }
}

export const subscribeToDuel = (duelId: string, callback: (duel: Duel | null) => void) => {
  return onSnapshot(doc(db, "duels", duelId), (doc) => {
    if (doc.exists()) {
      const data = doc.data()
      callback({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as Duel)
    } else {
      callback(null)
    }
  })
}

export const updateUsersElo = async (
  player1Id: string,
  player2Id: string,
  subject: keyof SubjectElo,
  player1Elo: number,
  player2Elo: number,
) => {
  try {
    // Don't update ELO for bot players
    if (player2Id.startsWith("bot_")) {
      // Only update player1 ELO
      await updateUserElo(player1Id, subject, player1Elo)
      return
    }

    const batch = writeBatch(db)

    // Get current user data to update specific subject ELO
    const player1Doc = await getDoc(doc(db, "users", player1Id))
    const player2Doc = await getDoc(doc(db, "users", player2Id))

    if (player1Doc.exists() && player2Doc.exists()) {
      const player1Data = player1Doc.data() as User
      const player2Data = player2Doc.data() as User

      const updatedPlayer1Elo = { ...player1Data.elo, [subject]: player1Elo }
      const updatedPlayer2Elo = { ...player2Data.elo, [subject]: player2Elo }

      batch.update(doc(db, "users", player1Id), { elo: updatedPlayer1Elo })
      batch.update(doc(db, "users", player2Id), { elo: updatedPlayer2Elo })

      await batch.commit()
    }
  } catch (error) {
    throw error
  }
}

export const getTopUsers = async (limit = 10, subject?: keyof SubjectElo): Promise<User[]> => {
  try {
    // Get all users and sort by the specified subject or overall ELO in memory
    const usersQuery = query(collection(db, "users"))
    const querySnapshot = await getDocs(usersQuery)

    const users = querySnapshot.docs.map((doc) => {
      try {
        const data = doc.data()
        
        // Handle createdAt conversion with fallback
        let createdAt: Date
        try {
          createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        } catch (dateError) {
          console.warn(`⚠️ Error converting createdAt for user ${doc.id}:`, dateError)
          createdAt = new Date() // Fallback to current date
        }
        
        // Ensure ELO structure exists with defaults
        const elo = {
          math: typeof data.elo?.math === 'number' ? data.elo.math : 0,
          bahasa: typeof data.elo?.bahasa === 'number' ? data.elo.bahasa : 0,
          english: typeof data.elo?.english === 'number' ? data.elo.english : 0,
        }
        
        return {
          id: doc.id,
          username: data.username || `user_${doc.id}`,
          email: data.email || '',
          elo,
          preferredSubject: data.preferredSubject,
          placementTestCompleted: Boolean(data.placementTestCompleted),
          createdAt,
        } as User
      } catch (userError) {
        console.error(`❌ Error processing user ${doc.id}:`, userError)
        // Return a minimal valid user object to prevent complete failure
        return {
          id: doc.id,
          username: `invalid_user_${doc.id}`,
          email: '',
          elo: { math: 0, bahasa: 0, english: 0 },
          placementTestCompleted: false,
          createdAt: new Date(),
        } as User
      }
    })

    // Filter out only truly invalid users (negative values or invalid usernames)
    const validUsers = users.filter(user => 
      user.elo.math >= 0 && user.elo.bahasa >= 0 && user.elo.english >= 0 &&
      user.username && !user.username.startsWith('invalid_user_')
    )

    // Sort by subject ELO or overall ELO
    validUsers.sort((a, b) => {
      try {
        const aElo = subject ? a.elo[subject] : getUserEloForSubject(a.elo)
        const bElo = subject ? b.elo[subject] : getUserEloForSubject(b.elo)
        return bElo - aElo
      } catch (sortError) {
        console.warn('⚠️ Error sorting users:', sortError)
        return 0
      }
    })

    return validUsers.slice(0, limit)
  } catch (error) {
    console.error("Error getting top users:", error)
    return []
  }
}

export const getUserRank = async (userId: string, subject?: keyof SubjectElo): Promise<number> => {
  try {
    const user = await getUserById(userId)
    if (!user) return 0

    // Get all users and calculate rank in memory
    const usersQuery = query(collection(db, "users"))
    const querySnapshot = await getDocs(usersQuery)

    const users = querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as User
    })

    const userElo = subject ? user.elo[subject] : getUserEloForSubject(user.elo)

    // Count users with higher ELO
    const higherEloUsers = users.filter((u) => {
      const uElo = subject ? u.elo[subject] : getUserEloForSubject(u.elo)
      return uElo > userElo
    })

    return higherEloUsers.length + 1
  } catch (error) {
    console.error("Error getting user rank:", error)
    return 0
  }
}

export const subscribeToLeaderboard = (callback: (users: User[]) => void, limit = 10, subject?: keyof SubjectElo) => {
  const usersQuery = query(collection(db, "users"))

  return onSnapshot(usersQuery, (querySnapshot) => {
    const users = querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as User
    })

    // Sort by subject ELO or overall ELO
    users.sort((a, b) => {
      const aElo = subject ? a.elo[subject] : getUserEloForSubject(a.elo)
      const bElo = subject ? b.elo[subject] : getUserEloForSubject(b.elo)
      return bElo - aElo
    })

    callback(users.slice(0, limit))
  })
}

export const getLeaderboardStats = async (subject?: keyof SubjectElo) => {
  try {
    const usersQuery = query(collection(db, "users"))
    const querySnapshot = await getDocs(usersQuery)

    const totalPlayers = querySnapshot.docs.length
    let totalElo = 0
    let highestElo = 0

    querySnapshot.docs.forEach((doc) => {
      const user = doc.data() as User
      const userElo = subject ? user.elo[subject] : getUserEloForSubject(user.elo)
      totalElo += userElo
      if (userElo > highestElo) {
        highestElo = userElo
      }
    })

    return {
      totalPlayers,
      averageElo: totalPlayers > 0 ? Math.round(totalElo / totalPlayers) : 0,
      highestElo,
    }
  } catch (error) {
    console.error("Error getting leaderboard stats:", error)
    return {
      totalPlayers: 0,
      averageElo: 0,
      highestElo: 0,
    }
  }
}

// Helper function to get ELO for a specific subject or overall average
export const getUserEloForSubject = (userElo: SubjectElo, subject?: keyof SubjectElo): number => {
  if (subject) {
    return userElo[subject]
  }
  // Return average if no subject specified
  return Math.round((userElo.math + userElo.bahasa + userElo.english) / 3)
}

// Helper function to get the highest ELO across all subjects
export const getHighestElo = (userElo: SubjectElo): number => {
  return Math.max(userElo.math, userElo.bahasa, userElo.english)
}
