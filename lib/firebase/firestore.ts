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

export interface User {
  id: string
  username: string
  email: string
  elo: number
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
  topic: string
  difficulty: string
  quizData?: QuizQuestion
  player1Answer?: string
  player2Answer?: string
  player1Time?: number
  player2Time?: number
  winnerId?: string
  status: "waiting" | "in_progress" | "completed" | "cancelled"
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
    const userDoc = await getDoc(doc(db, "users", uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        id: userDoc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
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
    const usersQuery = query(collection(db, "users"), orderBy("elo", "desc"))
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

export const updateUserElo = async (uid: string, newElo: number) => {
  try {
    await updateDoc(doc(db, "users", uid), { elo: newElo })
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

export const findWaitingDuel = async (topic: string, difficulty: string, currentUserId: string, userElo: number) => {
  try {
    const duelsQuery = query(
      collection(db, "duels"),
      where("status", "==", "waiting"),
      where("topic", "==", topic),
      where("difficulty", "==", difficulty),
      orderBy("createdAt", "asc"),
    )

    const querySnapshot = await getDocs(duelsQuery)

    for (const docSnapshot of querySnapshot.docs) {
      const duelData = docSnapshot.data()
      if (duelData.player1Id === currentUserId) continue

      // Get player1 data to check ELO
      const player1 = await getUserById(duelData.player1Id)
      if (player1 && Math.abs(player1.elo - userElo) <= 100) {
        return {
          id: docSnapshot.id,
          ...duelData,
          createdAt: duelData.createdAt.toDate(),
        } as Duel
      }
    }

    return null
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

export const updateUsersElo = async (player1Id: string, player2Id: string, player1Elo: number, player2Elo: number) => {
  try {
    const batch = writeBatch(db)

    batch.update(doc(db, "users", player1Id), { elo: player1Elo })
    batch.update(doc(db, "users", player2Id), { elo: player2Elo })

    await batch.commit()
  } catch (error) {
    throw error
  }
}

export const getTopUsers = async (limit: number = 10): Promise<User[]> => {
  try {
    const usersQuery = query(
      collection(db, "users"), 
      orderBy("elo", "desc")
    )
    const querySnapshot = await getDocs(usersQuery)
    return querySnapshot.docs.slice(0, limit).map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as User
    })
  } catch (error) {
    console.error("Error getting top users:", error)
    return []
  }
}

export const getUserRank = async (userId: string): Promise<number> => {
  try {
    const user = await getUserById(userId)
    if (!user) return 0

    const usersQuery = query(
      collection(db, "users"), 
      where("elo", ">", user.elo),
      orderBy("elo", "desc")
    )
    const querySnapshot = await getDocs(usersQuery)
    return querySnapshot.docs.length + 1
  } catch (error) {
    console.error("Error getting user rank:", error)
    return 0
  }
}

export const subscribeToLeaderboard = (limit: number = 10, callback: (users: User[]) => void) => {
  const usersQuery = query(
    collection(db, "users"), 
    orderBy("elo", "desc")
  )

  return onSnapshot(usersQuery, (querySnapshot) => {
    const users = querySnapshot.docs.slice(0, limit).map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as User
    })
    callback(users)
  })
}

export const getLeaderboardStats = async () => {
  try {
    const usersQuery = query(collection(db, "users"))
    const querySnapshot = await getDocs(usersQuery)
    
    const totalPlayers = querySnapshot.docs.length
    let totalElo = 0
    let highestElo = 0
    
    querySnapshot.docs.forEach((doc) => {
      const user = doc.data() as User
      totalElo += user.elo
      if (user.elo > highestElo) {
        highestElo = user.elo
      }
    })
    
    return {
      totalPlayers,
      averageElo: totalPlayers > 0 ? Math.round(totalElo / totalPlayers) : 0,
      highestElo
    }
  } catch (error) {
    console.error("Error getting leaderboard stats:", error)
    return {
      totalPlayers: 0,
      averageElo: 0,
      highestElo: 0
    }
  }
}
