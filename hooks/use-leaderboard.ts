import { useState, useEffect } from "react"
import { 
  getTopUsers, 
  getUserRank, 
  getLeaderboardStats, 
  subscribeToLeaderboard 
} from "@/lib/firebase/firestore"
import type { User } from "@/lib/firebase/firestore"

interface UseLeaderboardOptions {
  limit?: number
  realtime?: boolean
  includeStats?: boolean
}

interface LeaderboardStats {
  totalPlayers: number
  averageElo: number
  highestElo: number
}

interface UseLeaderboardReturn {
  topUsers: User[]
  stats: LeaderboardStats
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getUserRankPosition: (userId: string) => Promise<number>
}

export const useLeaderboard = ({
  limit = 10,
  realtime = true,
  includeStats = true
}: UseLeaderboardOptions = {}): UseLeaderboardReturn => {
  const [topUsers, setTopUsers] = useState<User[]>([])
  const [stats, setStats] = useState<LeaderboardStats>({
    totalPlayers: 0,
    averageElo: 0,
    highestElo: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setError(null)
      
      const promises: Promise<any>[] = [getTopUsers(limit)]
      
      if (includeStats) {
        promises.push(getLeaderboardStats())
      }
      
      const results = await Promise.all(promises)
      
      setTopUsers(results[0])
      
      if (includeStats && results[1]) {
        setStats(results[1])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch leaderboard data"
      setError(errorMessage)
      console.error("Leaderboard fetch error:", err)
      
      // Set default values when there's an error
      setTopUsers([])
      if (includeStats) {
        setStats({
          totalPlayers: 0,
          averageElo: 0,
          highestElo: 0
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const getUserRankPosition = async (userId: string): Promise<number> => {
    try {
      return await getUserRank(userId)
    } catch (err) {
      console.error("Error getting user rank:", err)
      return 0
    }
  }

  const refresh = async () => {
    setLoading(true)
    await fetchData()
  }

  useEffect(() => {
    fetchData()

    if (realtime) {
      const unsubscribe = subscribeToLeaderboard(limit, (users) => {
        setTopUsers(users)
        setError(null)
      })

      return () => unsubscribe()
    }
  }, [limit, realtime, includeStats])

  return {
    topUsers,
    stats,
    loading,
    error,
    refresh,
    getUserRankPosition
  }
}

// Utility functions for leaderboard display
export const getEloColor = (elo: number): string => {
  if (elo >= 1200) return "text-yellow-400"
  if (elo >= 800) return "text-cyan-400"
  if (elo >= 600) return "text-green-400"
  return "text-pink-400"
}

export const getRankTitle = (elo: number): string => {
  if (elo >= 1200) return "GRANDMASTER"
  if (elo >= 800) return "MASTER"
  if (elo >= 600) return "EXPERT"
  return "ROOKIE"
}

export const getRankTier = (elo: number): 'rookie' | 'expert' | 'master' | 'grandmaster' => {
  if (elo >= 1200) return 'grandmaster'
  if (elo >= 800) return 'master'
  if (elo >= 600) return 'expert'
  return 'rookie'
}

export const getProgressToNextRank = (elo: number): { current: number; next: number; progress: number } => {
  if (elo < 600) {
    return { current: elo, next: 600, progress: (elo / 600) * 100 }
  } else if (elo < 800) {
    return { current: elo, next: 800, progress: ((elo - 600) / 200) * 100 }
  } else if (elo < 1200) {
    return { current: elo, next: 1200, progress: ((elo - 800) / 400) * 100 }
  } else {
    return { current: elo, next: elo, progress: 100 }
  }
}
