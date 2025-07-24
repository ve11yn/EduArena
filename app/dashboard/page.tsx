"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { signOutUser } from "@/lib/firebase/auth"
import { useLeaderboard, getEloColor, getRankTitle } from "@/hooks/use-leaderboard"
import { getUserEloForSubject } from "@/lib/firebase/firestore"
import { Trophy, TrendingUp, Users, LogOut, Gamepad2, Crown, Medal, Award } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const { topUsers, stats, loading: leaderboardLoading, getUserRankPosition } = useLeaderboard({
    limit: 10,
    realtime: true,
    includeStats: true
  })
  const [userRankPosition, setUserRankPosition] = useState<number>(0)
  const [initialLeaderboardLoaded, setInitialLeaderboardLoaded] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  // Helper function to get display ELO
  const getDisplayElo = (userElo: any) => {
    if (typeof userElo === 'number') return userElo // Legacy support
    return getUserEloForSubject(userElo, userProfile?.preferredSubject)
  }

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    const fetchUserRank = async () => {
      if (userProfile) {
        const rank = await getUserRankPosition(userProfile.id)
        setUserRankPosition(rank)
      }
    }

    fetchUserRank()
  }, [user, userProfile, authLoading, router, getUserRankPosition])

  // Mark initial leaderboard as loaded after first load
  useEffect(() => {
    if (!leaderboardLoading && !initialLeaderboardLoaded) {
      setInitialLeaderboardLoaded(true)
    }
  }, [leaderboardLoading, initialLeaderboardLoaded])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await signOutUser()
      
      // Clear any session cookies
      document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      
      // Clear local storage if needed
      localStorage.removeItem('userSession')
      
      // The auth context will automatically detect the sign out and redirect
      // But we'll add a small delay and manual redirect as fallback
      setTimeout(() => {
        router.push("/login")
      }, 1000)
      
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoggingOut(false)
      // Still try to redirect even if there's an error
      router.push("/login")
    }
  }

  const getUserRank = () => {
    return userRankPosition
  }

  if (authLoading || (!initialLeaderboardLoaded && leaderboardLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-400 border-t-transparent"
        />
        <span className="ml-4 font-pixel text-cyan-400 text-lg">LOADING...</span>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-slate-800/80 border-2 border-cyan-400 p-6"
        >
          <div>
            <h1 className="font-pixel text-2xl md:text-3xl text-cyan-400 mb-2 tracking-wider">
              WELCOME {userProfile.username.toUpperCase()}
            </h1>
            <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-transparent mb-2"></div>
            <p className="font-terminal text-cyan-300 text-lg">READY FOR BATTLE?</p>
            <div className="mt-4">
              <div className="flex gap-4 relative z-10">
                <Link href="/play">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="retro-button font-pixel text-slate-900 px-8 py-3 text-sm tracking-wider"
                    style={{ pointerEvents: 'auto' }}
                  >
                    ⚔️ PLAY NOW
                  </motion.button>
                </Link>
                <Link href="/leaderboard" className="relative z-10">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-yellow-400/20 border-2 border-yellow-400 text-yellow-400 font-pixel px-6 py-3 text-sm tracking-wider hover:bg-yellow-400/30 transition-colors relative z-10"
                    style={{ pointerEvents: 'auto' }} // Ensure button is always clickable
                  >
                    🏆 RANKINGS
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 border-2 font-pixel text-xs tracking-wider transition-colors relative z-50 ${
              isLoggingOut 
                ? "bg-gray-600/80 border-gray-400 text-gray-300 cursor-not-allowed"
                : "bg-red-600/80 border-red-400 text-red-300 hover:bg-red-600"
            }`}
            style={{ pointerEvents: 'auto' }}
          >
            <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
            {isLoggingOut ? 'LOGGING OUT...' : 'LOGOUT'}
          </button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/80 border-2 border-yellow-400 p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <span className="font-pixel text-xs text-yellow-400 tracking-wider">ELO RATING</span>
            </div>
            <div className={`font-pixel text-3xl ${getEloColor(getDisplayElo(userProfile.elo))} mb-2`}>
              {getDisplayElo(userProfile.elo)}
            </div>
            <p className="font-terminal text-yellow-300 text-sm">{getRankTitle(getDisplayElo(userProfile.elo))}</p>
            {userProfile.preferredSubject && (
              <p className="font-terminal text-xs text-yellow-200 mt-1">
                {userProfile.preferredSubject.toUpperCase()}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/80 border-2 border-green-400 p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <span className="font-pixel text-xs text-green-400 tracking-wider">RANK</span>
            </div>
            <div className="font-pixel text-3xl text-green-400 mb-2">#{getUserRank()}</div>
            <p className="font-terminal text-green-300 text-sm">OF {stats.totalPlayers} PLAYERS</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/80 border-2 border-pink-400 p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-pink-400" />
              <span className="font-pixel text-xs text-pink-400 tracking-wider">PLAYERS</span>
            </div>
            <div className="font-pixel text-3xl text-pink-400 mb-2">{stats.totalPlayers}</div>
            <p className="font-terminal text-pink-300 text-sm">ACTIVE WARRIORS</p>
          </motion.div>
        </div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Gamepad2 className="w-6 h-6 text-cyan-400" />
            <h2 className="font-pixel text-xl text-cyan-400 tracking-wider">LEADERBOARD</h2>
            {leaderboardLoading && initialLeaderboardLoaded && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"
              />
            )}
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-transparent mb-6"></div>

          <div className="space-y-3">
            {topUsers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className={`flex items-center justify-between p-4 border-2 transition-all ${
                  player.id === userProfile.id
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-slate-600 hover:border-slate-500 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 flex items-center justify-center font-pixel text-xs relative ${
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
                    {index === 0 && <Crown className="absolute -top-2 -right-2 w-4 h-4 text-yellow-400" />}
                    {index === 1 && <Medal className="absolute -top-2 -right-2 w-4 h-4 text-gray-400" />}
                    {index === 2 && <Award className="absolute -top-2 -right-2 w-4 h-4 text-amber-600" />}
                  </div>
                  <div>
                    <p className="font-pixel text-sm text-cyan-400">
                      {player.username.toUpperCase()}
                      {player.id === userProfile.id && (
                        <span className="ml-2 text-xs bg-cyan-400 text-black px-2 py-1">YOU</span>
                      )}
                    </p>
                    <p className="font-terminal text-xs text-cyan-300">
                      JOINED {player.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-pixel text-lg ${getEloColor(getDisplayElo(player.elo))}`}>
                    {getDisplayElo(player.elo)}
                  </div>
                  <div className="font-terminal text-xs text-cyan-300">{getRankTitle(getDisplayElo(player.elo))}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
