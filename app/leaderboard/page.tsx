"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { 
  getTopUsers, 
  getUserRank, 
  getLeaderboardStats,
  subscribeToLeaderboard 
} from "@/lib/firebase/firestore"
import { 
  Trophy, 
  Crown, 
  Medal, 
  Award, 
  TrendingUp, 
  Users, 
  Zap,
  Filter,
  ChevronDown,
  Calendar,
  Target
} from "lucide-react"
import Link from "next/link"
import type { User } from "@/lib/firebase/firestore"
import type { SubjectElo } from "@/lib/firebase/auth"
import DebugAuth from "@/components/debug-auth"

interface LeaderboardStats {
  totalPlayers: number
  averageElo: number
  highestElo: number
}

export default function LeaderboardPage() {
  const { user, userProfile } = useAuth()
  const [topUsers, setTopUsers] = useState<User[]>([])
  const [userRank, setUserRank] = useState<number>(0)
  const [stats, setStats] = useState<LeaderboardStats>({
    totalPlayers: 0,
    averageElo: 0,
    highestElo: 0
  })
  const [loading, setLoading] = useState(true)
  const [viewLimit, setViewLimit] = useState(25)
  const [filterView, setFilterView] = useState<'all' | 'rookies' | 'experts' | 'masters' | 'grandmasters'>('all')
  const [subjectFilter, setSubjectFilter] = useState<'overall' | 'math' | 'bahasa' | 'english'>('overall')
  const [permissionError, setPermissionError] = useState(false)

  console.log(`🔐 Auth state - user: ${user ? user.uid : 'null'}, userProfile: ${userProfile ? userProfile.username : 'null'}`)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subject = subjectFilter === 'overall' ? undefined : subjectFilter as keyof SubjectElo
        console.log(`🔍 Fetching leaderboard data for subject: ${subject || 'overall'}`)
        
        console.log(`🔧 About to call getTopUsers(100, ${subject})`)
        const users = await getTopUsers(100, subject)
        console.log(`📊 getTopUsers returned ${users.length} users:`, users)
        
        if (users.length === 0) {
          console.warn(`⚠️ No users returned - this might be a permissions issue!`)
          console.warn(`⚠️ Check Firestore security rules for users collection`)
        }
        
        console.log(`🔧 About to call getLeaderboardStats(${subject})`)
        const leaderboardStats = await getLeaderboardStats(subject)
        console.log(`� getLeaderboardStats returned:`, leaderboardStats)
        
        console.log(`🎯 Raw users data:`, users.map(u => ({
          username: u.username,
          id: u.id,
          elo: u.elo,
          overallElo: getPlayerElo(u)
        })))
        
        setTopUsers(users)
        setStats(leaderboardStats)
        setPermissionError(false)
        
        if (userProfile) {
          console.log(`🔧 Getting rank for user ${userProfile.id}`)
          const rank = await getUserRank(userProfile.id, subject)
          console.log(`📊 User rank: ${rank}`)
          setUserRank(rank)
        }
      } catch (error) {
        console.error("❌ Error fetching leaderboard data:", error)
        console.error("❌ Error details:", error instanceof Error ? error.message : error)
        console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace')
        if (error instanceof Error && error.message.includes('permission')) {
          setPermissionError(true)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Subscribe to real-time updates
    const subject = subjectFilter === 'overall' ? undefined : subjectFilter as keyof SubjectElo
    const unsubscribe = subscribeToLeaderboard((users) => {
      console.log(`🔄 Real-time update: ${users.length} users`)
      setTopUsers(users)
    }, 100, subject)

    return () => unsubscribe()
  }, [userProfile, subjectFilter])

  // Helper function to get ELO for the current subject filter
  const getPlayerElo = (player: User): number => {
    try {
      // Safety check for user and ELO data
      if (!player || !player.elo) {
        console.warn(`⚠️ Player missing ELO data:`, player)
        return 0
      }

      if (subjectFilter === 'overall') {
        // Ensure all ELO values exist and are numbers
        const math = typeof player.elo.math === 'number' ? player.elo.math : 0
        const bahasa = typeof player.elo.bahasa === 'number' ? player.elo.bahasa : 0
        const english = typeof player.elo.english === 'number' ? player.elo.english : 0
        
        // Return average ELO for overall ranking
        return Math.round((math + bahasa + english) / 3)
      }
      
      // Get specific subject ELO with fallback
      const subjectElo = player.elo[subjectFilter as keyof SubjectElo]
      return typeof subjectElo === 'number' ? subjectElo : 0
    } catch (error) {
      console.error(`❌ Error getting ELO for player ${player?.username || 'unknown'}:`, error)
      return 0
    }
  }

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
        return <Crown className="w-5 h-5 text-yellow-400" />
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return null
    }
  }

  const filterUsers = (users: User[]) => {
    console.log(`🔍 Filtering users with filterView: ${filterView}`)
    console.log(`📊 Total users before filter: ${users.length}`)
    
    try {
      let filtered: User[]
      switch (filterView) {
        case 'rookies':
          filtered = users.filter(u => {
            try {
              const elo = getPlayerElo(u)
              return elo >= 0 && elo < 600 // Include users starting from 0 ELO
            } catch (error) {
              console.warn(`⚠️ Error filtering rookie user ${u.username}:`, error)
              return false
            }
          })
          break
        case 'experts':
          filtered = users.filter(u => {
            try {
              const elo = getPlayerElo(u)
              return elo >= 600 && elo < 800
            } catch (error) {
              console.warn(`⚠️ Error filtering expert user ${u.username}:`, error)
              return false
            }
          })
          break
        case 'masters':
          filtered = users.filter(u => {
            try {
              const elo = getPlayerElo(u)
              return elo >= 800 && elo < 1200
            } catch (error) {
              console.warn(`⚠️ Error filtering master user ${u.username}:`, error)
              return false
            }
          })
          break
        case 'grandmasters':
          filtered = users.filter(u => {
            try {
              const elo = getPlayerElo(u)
              return elo >= 1200
            } catch (error) {
              console.warn(`⚠️ Error filtering grandmaster user ${u.username}:`, error)
              return false
            }
          })
          break
        default:
          filtered = users.filter(u => {
            try {
              const elo = getPlayerElo(u)
              return elo >= 0 // Include all users with valid ELO (including 1000 default)
            } catch (error) {
              console.warn(`⚠️ Error checking user ${u.username}:`, error)
              return false
            }
          })
      }
      
      console.log(`✅ Users after filter: ${filtered.length}`)
      return filtered
    } catch (error) {
      console.error(`❌ Critical error in filterUsers:`, error)
      return []
    }
  }

  const filteredUsers = useMemo(() => {
    console.log(`🎯 Starting filteredUsers calculation with ${topUsers.length} users`)
    console.log(`🔍 Current filterView: ${filterView}, subjectFilter: ${subjectFilter}`)
    
    const filtered = filterUsers(topUsers)
    console.log(`✅ After filtering: ${filtered.length} users`)
    console.log(`📋 Filtered users with ELO:`, filtered.map(u => ({
      username: u.username,
      elo: getPlayerElo(u),
      rawElo: u.elo
    })))
    
    const result = filtered.slice(0, viewLimit)
    console.log(`📊 Final result after viewLimit (${viewLimit}): ${result.length} users`)
    
    return result
  }, [topUsers, filterView, viewLimit])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full"
        />
        <span className="ml-4 font-pixel text-cyan-400 text-lg">LOADING LEADERBOARD...</span>
      </div>
    )
  }

  if (permissionError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-900/80 border-2 border-red-400 p-8 max-w-lg text-center">
          <h1 className="font-pixel text-2xl text-red-400 mb-4">⚠️ PERMISSION ERROR</h1>
          <p className="font-terminal text-red-300 mb-4">
            Firebase Firestore rules need to be updated to allow reading user data for the leaderboard.
          </p>
          <div className="bg-red-800/50 border border-red-600 p-4 text-left text-xs font-mono mb-4">
            <p className="text-red-200 mb-2">Please update your Firestore rules:</p>
            <code className="text-red-100">
              allow read: if request.auth != null;
            </code>
          </div>
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="retro-button font-pixel text-slate-900 px-6 py-2 text-sm"
            >
              ← BACK TO DASHBOARD
            </motion.button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      {/* <DebugAuth /> */}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="font-pixel text-3xl text-cyan-400 mb-2 tracking-wider">
                GLOBAL LEADERBOARD
              </h1>
              <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-transparent mb-2"></div>
              <p className="font-terminal text-cyan-300">COMPETE FOR GLORY</p>
            </div>
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-4 md:mt-0 retro-button font-pixel text-slate-900 px-6 py-2 text-sm"
              >
                ← DASHBOARD
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/80 border-2 border-cyan-400 p-4"
          >
            <Users className="w-6 h-6 text-cyan-400 mb-2" />
            <div className="font-pixel text-xl text-cyan-400">{stats.totalPlayers}</div>
            <div className="font-terminal text-xs text-cyan-300">TOTAL PLAYERS</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/80 border-2 border-green-400 p-4"
          >
            <TrendingUp className="w-6 h-6 text-green-400 mb-2" />
            <div className="font-pixel text-xl text-green-400">{stats.averageElo}</div>
            <div className="font-terminal text-xs text-green-300">AVERAGE ELO</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/80 border-2 border-yellow-400 p-4"
          >
            <Zap className="w-6 h-6 text-yellow-400 mb-2" />
            <div className="font-pixel text-xl text-yellow-400">{stats.highestElo}</div>
            <div className="font-terminal text-xs text-yellow-300">HIGHEST ELO</div>
          </motion.div>

          {userProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-800/80 border-2 border-pink-400 p-4"
            >
              <Target className="w-6 h-6 text-pink-400 mb-2" />
              <div className="font-pixel text-xl text-pink-400">#{userRank}</div>
              <div className="font-terminal text-xs text-pink-300">YOUR RANK</div>
            </motion.div>
          )}
        </div>

        {/* Filters and Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-800/80 border-2 border-slate-600 p-4 mb-6 relative z-50"
        >
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <Filter className="w-5 h-5 text-slate-400" />
              
              {/* Subject Filter */}
              <div className="flex items-center gap-2">
                <span className="font-terminal text-xs text-slate-400">SUBJECT:</span>
                <select
                  value={subjectFilter}
                  onChange={(e) => {
                    const newSubject = e.target.value as typeof subjectFilter
                    console.log(`🎯 Subject filter changed from ${subjectFilter} to ${newSubject}`)
                    setSubjectFilter(newSubject)
                  }}
                  className="bg-slate-700 border border-slate-600 text-cyan-400 font-pixel text-sm px-3 py-2 cursor-pointer hover:border-cyan-400 transition-colors relative z-10"
                >
                  <option value="overall">OVERALL</option>
                  <option value="math">MATHEMATICS</option>
                  <option value="bahasa">BAHASA INDONESIA</option>
                  <option value="english">ENGLISH</option>
                </select>
              </div>

              {/* Rank Filter */}
              <div className="flex items-center gap-2">
                <span className="font-terminal text-xs text-slate-400">RANK:</span>
                <select
                  value={filterView}
                  onChange={(e) => {
                    const newFilter = e.target.value as typeof filterView
                    console.log(`🎯 Filter changed from ${filterView} to ${newFilter}`)
                    console.log(`🎯 Event target value:`, e.target.value)
                    setFilterView(newFilter)
                  }}
                  className="bg-slate-700 border border-slate-600 text-cyan-400 font-pixel text-sm px-3 py-2 cursor-pointer hover:border-cyan-400 transition-colors relative z-10"
                >
                  <option value="all">ALL RANKS</option>
                  <option value="rookies">ROOKIES (0-599)</option>
                  <option value="experts">EXPERTS (600-799)</option>
                  <option value="masters">MASTERS (800-1199)</option>
                  <option value="grandmasters">GRANDMASTERS (1200+)</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-terminal text-xs text-slate-400">SHOW:</span>
              <select
                value={viewLimit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value)
                  console.log(`📊 View limit changed from ${viewLimit} to ${newLimit}`)
                  setViewLimit(newLimit)
                }}
                className="bg-slate-700 border border-slate-600 text-cyan-400 font-pixel text-sm px-3 py-2 cursor-pointer hover:border-cyan-400 transition-colors relative z-10"
              >
                <option value={10}>TOP 10</option>
                <option value={25}>TOP 25</option>
                <option value={50}>TOP 50</option>
                <option value={100}>TOP 100</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-cyan-400" />
            <h2 className="font-pixel text-xl text-cyan-400 tracking-wider">
              {subjectFilter.toUpperCase()} {filterView.toUpperCase()} RANKINGS
            </h2>
            <span className="text-xs bg-cyan-400/20 text-cyan-300 px-2 py-1 font-terminal">
              {filteredUsers.length} PLAYERS
            </span>
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-transparent mb-6"></div>

          <div className="space-y-2">
            {filteredUsers.map((player, index) => {
              const globalRank = topUsers.findIndex(u => u.id === player.id) + 1
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  className={`flex items-center justify-between p-4 border-2 transition-all ${
                    player.id === userProfile?.id
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-slate-600 hover:border-slate-500 bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 flex items-center justify-center font-pixel text-sm relative ${
                        globalRank === 1
                          ? "bg-yellow-400 text-black"
                          : globalRank === 2
                            ? "bg-gray-400 text-black"
                            : globalRank === 3
                              ? "bg-amber-600 text-black"
                              : "bg-slate-600 text-cyan-400"
                      }`}
                    >
                      {globalRank}
                      {getRankIcon(globalRank - 1) && (
                        <div className="absolute -top-2 -right-2">
                          {getRankIcon(globalRank - 1)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-pixel text-lg text-cyan-400">
                          {player.username.toUpperCase()}
                        </p>
                        {player.id === userProfile?.id && (
                          <span className="text-xs bg-cyan-400 text-black px-2 py-1 font-pixel">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="font-terminal text-xs text-cyan-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          JOINED {player.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-pixel text-2xl ${getEloColor(getPlayerElo(player))}`}>
                      {getPlayerElo(player)}
                    </div>
                    <div className="font-terminal text-sm text-cyan-300">
                      {getRankTitle(getPlayerElo(player))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="font-pixel text-slate-400 text-lg">NO PLAYERS IN THIS CATEGORY</p>
              <p className="font-terminal text-xs text-slate-500 mt-2">
                TRY SELECTING A DIFFERENT RANK FILTER
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
