"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  getTopUsers, 
  subscribeToLeaderboard, 
  getLeaderboardStats 
} from "@/lib/firebase/firestore"
import { Trophy, Crown, Medal, Award, TrendingUp, Users, Zap } from "lucide-react"
import type { User } from "@/lib/firebase/firestore"
import type { SubjectElo } from "@/lib/firebase/auth"

interface LeaderboardProps {
  currentUserId?: string
  limit?: number
  showStats?: boolean
  className?: string
  subject?: keyof SubjectElo | 'overall'
}

export default function Leaderboard({ 
  currentUserId, 
  limit = 10, 
  showStats = true,
  className = "",
  subject = 'overall'
}: LeaderboardProps) {
  const [topUsers, setTopUsers] = useState<User[]>([])
  const [stats, setStats] = useState({
    totalPlayers: 0,
    averageElo: 0,
    highestElo: 0
  })
  const [loading, setLoading] = useState(true)

  // Helper function to get ELO for the current subject
  const getPlayerElo = (player: User): number => {
    if (subject === 'overall') {
      // Return average ELO for overall ranking
      return Math.round((player.elo.math + player.elo.bahasa + player.elo.english) / 3)
    }
    return player.elo[subject as keyof SubjectElo]
  }

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const subjectParam = subject === 'overall' ? undefined : subject as keyof SubjectElo
        const [users, leaderboardStats] = await Promise.all([
          getTopUsers(limit, subjectParam),
          showStats ? getLeaderboardStats(subjectParam) : Promise.resolve({
            totalPlayers: 0,
            averageElo: 0,
            highestElo: 0
          })
        ])
        
        setTopUsers(users)
        setStats(leaderboardStats)
      } catch (error) {
        console.error("Error fetching leaderboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()

    // Subscribe to real-time updates
    const subjectParam = subject === 'overall' ? undefined : subject as keyof SubjectElo
    const unsubscribe = subscribeToLeaderboard((users) => {
      setTopUsers(users)
    }, limit, subjectParam)

    return () => unsubscribe()
  }, [limit, showStats, subject])

  const getEloColor = (elo: number) => {
    if (elo >= 1200) return "text-yellow-400"
    if (elo >= 800) return "text-cyan-400"
    if (elo >= 600) return "text-green-400"
    return "text-pink-400"
  }

  const getRankTitle = (elo: number) => {
    if (elo >= 1200) return "GRANDMASTER"
    if (elo >= 800) return "MASTER"
    if (elo >= 600) return "EXPERT"
    return "ROOKIE"
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-4 h-4 text-yellow-400" />
      case 1:
        return <Medal className="w-4 h-4 text-gray-400" />
      case 2:
        return <Award className="w-4 h-4 text-amber-600" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className={`bg-slate-800/80 border-2 border-cyan-400 p-6 ${className}`}>
        <div className="flex items-center justify-center min-h-[200px]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full"
          />
          <span className="ml-4 font-pixel text-cyan-400">LOADING...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-slate-800/80 border-2 border-cyan-400 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-cyan-400" />
        <h2 className="font-pixel text-xl text-cyan-400 tracking-wider">LEADERBOARD</h2>
      </div>
      <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-transparent mb-6"></div>

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-600 p-3 text-center">
            <Users className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <div className="font-pixel text-lg text-cyan-400">{stats.totalPlayers}</div>
            <div className="font-terminal text-xs text-cyan-300">PLAYERS</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-600 p-3 text-center">
            <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <div className="font-pixel text-lg text-green-400">{stats.averageElo}</div>
            <div className="font-terminal text-xs text-green-300">AVG ELO</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-600 p-3 text-center">
            <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="font-pixel text-lg text-yellow-400">{stats.highestElo}</div>
            <div className="font-terminal text-xs text-yellow-300">HIGHEST</div>
          </div>
        </div>
      )}

      {/* Player List */}
      <div className="space-y-3">
        {topUsers.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-4 border-2 transition-all ${
              player.id === currentUserId
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-slate-600 hover:border-slate-500 bg-slate-900/50"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 flex items-center justify-center font-pixel text-sm relative ${
                  index === 0
                    ? "bg-yellow-400 text-black"
                    : index === 1
                      ? "bg-gray-400 text-black"
                      : index === 2
                        ? "bg-amber-600 text-black"
                        : "bg-slate-600 text-cyan-400"
                }`}
              >
                {index + 1}
                {getRankIcon(index) && (
                  <div className="absolute -top-2 -right-2">
                    {getRankIcon(index)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-pixel text-sm text-cyan-400">
                    {player.username.toUpperCase()}
                  </p>
                  {player.id === currentUserId && (
                    <span className="text-xs bg-cyan-400 text-black px-2 py-1 font-pixel">YOU</span>
                  )}
                </div>
                <p className="font-terminal text-xs text-cyan-300">
                  JOINED {player.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-pixel text-lg ${getEloColor(getPlayerElo(player))}`}>
                {getPlayerElo(player)}
              </div>
              <div className="font-terminal text-xs text-cyan-300">
                {getRankTitle(getPlayerElo(player))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {topUsers.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="font-pixel text-slate-400">NO PLAYERS YET</p>
          <p className="font-terminal text-xs text-slate-500 mt-2">
            BE THE FIRST TO JOIN THE BATTLE!
          </p>
        </div>
      )}
    </div>
  )
}
