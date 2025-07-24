"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Trophy, TrendingUp, Users, LogOut, Gamepad2 } from "lucide-react"

interface User {
  id: string
  username: string
  elo: number
  created_at: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (userError) {
        console.error("Error fetching user:", userError)
        return
      }

      setUser(userData)

      const { data: allUsersData, error: allUsersError } = await supabase
        .from("users")
        .select("*")
        .order("elo", { ascending: false })

      if (allUsersError) {
        console.error("Error fetching users:", allUsersError)
        return
      }

      setAllUsers(allUsersData)
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const getUserRank = () => {
    if (!user) return 0
    return allUsers.findIndex((u) => u.id === user.id) + 1
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

  if (loading) {
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

  if (!user) {
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
              WELCOME {user.username.toUpperCase()}
            </h1>
            <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-transparent mb-2"></div>
            <p className="font-terminal text-cyan-300 text-lg">READY FOR BATTLE?</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-red-600/80 border-2 border-red-400 text-red-300 font-pixel text-xs tracking-wider hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            LOGOUT
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
            <div className={`font-pixel text-3xl ${getEloColor(user.elo)} mb-2`}>{user.elo}</div>
            <p className="font-terminal text-yellow-300 text-sm">{getRankTitle(user.elo)}</p>
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
            <p className="font-terminal text-green-300 text-sm">OF {allUsers.length} PLAYERS</p>
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
            <div className="font-pixel text-3xl text-pink-400 mb-2">{allUsers.length}</div>
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
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-transparent mb-6"></div>

          <div className="space-y-3">
            {allUsers.slice(0, 10).map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className={`flex items-center justify-between p-4 border-2 transition-all ${
                  player.id === user.id
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-slate-600 hover:border-slate-500 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 flex items-center justify-center font-pixel text-xs ${
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
                  </div>
                  <div>
                    <p className="font-pixel text-sm text-cyan-400">
                      {player.username.toUpperCase()}
                      {player.id === user.id && (
                        <span className="ml-2 text-xs bg-cyan-400 text-black px-2 py-1">YOU</span>
                      )}
                    </p>
                    <p className="font-terminal text-xs text-cyan-300">
                      JOINED {new Date(player.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-pixel text-lg ${getEloColor(player.elo)}`}>{player.elo}</div>
                  <div className="font-terminal text-xs text-cyan-300">{getRankTitle(player.elo)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
