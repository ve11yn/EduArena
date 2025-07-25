"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { socketClient } from "@/lib/socket-client"
import { startGame } from "@/lib/game-service"
import { Users, Trophy, ArrowLeft } from "lucide-react"

export default function MatchmakingPage() {
  const [queueStatus, setQueueStatus] = useState({ position: 0, playersInQueue: 0 })
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState("")
  const [matchFound, setMatchFound] = useState(false)
  const [opponent, setOpponent] = useState<any>(null)

  const { user, userProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const subject = searchParams.get("subject") || "math"

  useEffect(() => {
    if (!user || !userProfile) {
      router.push("/login")
      return
    }

    // Start the matchmaking process
    const initializeMatchmaking = async () => {
      try {
        setError("")
        console.log("🎯 Starting PvP matchmaking...")
        console.log("📍 Current URL:", window.location.origin)
        console.log("📍 NODE_ENV:", process.env.NODE_ENV)
        console.log("👤 User:", userProfile.username)
        console.log("📚 Subject:", subject)
        
        // Get user token for API calls
        const token = await user.getIdToken()
        console.log("🔑 Got user token")
        
        // Start the game (this will join the queue)
        const result = await startGame(
          {
            mode: "pvp",
            subject: subject as any,
          },
          userProfile,
          token
        )

        console.log("🎮 Game start result:", result)

        if (!result.success) {
          setError(result.error || "Failed to start matchmaking")
          return
        }

        console.log("✅ Successfully joined matchmaking queue")
      } catch (error) {
        console.error("❌ Matchmaking initialization error:", error)
        setError(error instanceof Error ? error.message : "Failed to initialize matchmaking")
      }
    }

    // Initialize matchmaking
    initializeMatchmaking()

    // Connect to socket
    const socket = socketClient.connect()

    // Set up event listeners
    socket.on("connect", () => {
      console.log("🔌 Connected to matchmaking server")
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      console.log("🔌 Disconnected from matchmaking server")
      setIsConnected(false)
    })

    socket.on("queue-status", (data) => {
      console.log("📊 Queue status:", data)
      setQueueStatus(data)
    })

    socket.on("match-found", (data) => {
      console.log("🎯 Match found!", data)
      setMatchFound(true)
      setOpponent(data.opponent)

      // Redirect to game after showing match found animation
      setTimeout(() => {
        router.push(`/duel/${data.duelId}`)
      }, 3000)
    })

    socket.on("error", (errorMsg) => {
      console.error("❌ Socket error:", errorMsg)
      setError(errorMsg)
    })

    // Cleanup on unmount
    return () => {
      socket.off("connect")
      socket.off("disconnect")
      socket.off("queue-status")
      socket.off("match-found")
      socket.off("error")

      // Leave queue when component unmounts
      socketClient.safeLeaveQueue()
    }
  }, [user, userProfile, router, subject])

  const handleCancel = () => {
    socketClient.safeLeaveQueue()
    socketClient.disconnect()
    router.push("/play")
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-pixel text-2xl text-red-400 mb-4">AUTHENTICATION REQUIRED</h1>
          <button onClick={() => router.push("/login")} className="retro-button font-pixel text-slate-900 px-6 py-3">
            LOGIN
          </button>
        </div>
      </div>
    )
  }

  if (matchFound && opponent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-slate-800/80 border-2 border-green-400 p-8 max-w-md"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: 2 }}
            className="text-6xl mb-6"
          >
            ⚔️
          </motion.div>
          <h1 className="font-pixel text-2xl text-green-400 mb-4">MATCH FOUND!</h1>
          <div className="bg-slate-900/50 border border-green-400/50 p-4 mb-6">
            <h3 className="font-pixel text-lg text-cyan-400 mb-2">YOUR OPPONENT</h3>
            <div className="font-terminal text-green-300 text-lg">{opponent.username}</div>
            <div className="font-terminal text-cyan-300 text-sm">ELO: {opponent.elo}</div>
          </div>
          <p className="font-terminal text-green-300 mb-4">Preparing battle arena...</p>
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Users className="w-12 h-12 text-cyan-400" />
            <h1 className="font-pixel text-4xl text-cyan-400 tracking-wider">MATCHMAKING</h1>
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-4"></div>
          <p className="font-terminal text-xl text-cyan-300">Finding worthy opponent...</p>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mb-8 p-4 border-2 text-center ${
            isConnected ? "bg-green-900/20 border-green-400" : "bg-red-900/20 border-red-400"
          }`}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
            <span className={`font-pixel text-sm ${isConnected ? "text-green-400" : "text-red-400"}`}>
              {isConnected ? "CONNECTED" : "CONNECTING..."}
            </span>
          </div>
          {!isConnected && (
            <p className="font-terminal text-xs text-slate-400">Establishing connection to battle servers...</p>
          )}
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/20 border-2 border-red-400 p-4 mb-6 text-center"
          >
            <p className="font-pixel text-red-300 text-sm">ERROR: {error}</p>
          </motion.div>
        )}

        {/* Queue Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-8 mb-8"
        >
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-6"
            />
            <h2 className="font-pixel text-2xl text-cyan-400 mb-4">SEARCHING FOR OPPONENT</h2>
            <p className="font-terminal text-cyan-300 mb-6">Subject: {subject.toUpperCase()} • ELO-Based Matching</p>
          </div>

          {/* Queue Stats */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-center">
              <div className="font-pixel text-3xl text-yellow-400 mb-2">{queueStatus.position}</div>
              <div className="font-terminal text-sm text-cyan-300">POSITION IN QUEUE</div>
            </div>
            <div className="text-center">
              <div className="font-pixel text-3xl text-pink-400 mb-2">{queueStatus.playersInQueue}</div>
              <div className="font-terminal text-sm text-cyan-300">PLAYERS SEARCHING</div>
            </div>
          </div>

          {/* Player Info */}
          <div className="bg-slate-900/50 border border-cyan-400/50 p-4 mb-6">
            <h3 className="font-pixel text-lg text-cyan-400 mb-4 text-center">YOUR BATTLE STATS</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-pixel text-sm text-pink-400 mb-1">WARRIOR</div>
                <div className="font-terminal text-cyan-300">{userProfile.username}</div>
              </div>
              <div>
                <div className="font-pixel text-sm text-pink-400 mb-1">ELO RATING</div>
                <div className="font-terminal text-cyan-300">
                  {userProfile.elo[subject as keyof typeof userProfile.elo] || 1500}
                </div>
              </div>
              <div>
                <div className="font-pixel text-sm text-pink-400 mb-1">SUBJECT</div>
                <div className="font-terminal text-cyan-300">{subject.toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Matching Info */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="font-pixel text-sm text-yellow-400">ELO-BASED MATCHING</span>
            </div>
            <p className="font-terminal text-xs text-slate-400 mb-4">
              Finding opponents with similar skill level for fair competition
            </p>
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
          </div>
        </motion.div>

        {/* Cancel Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={handleCancel}
            className="bg-slate-800/80 border-2 border-red-400 text-red-400 font-pixel px-8 py-4 hover:bg-red-400/10 transition-all flex items-center gap-3 mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            CANCEL SEARCH
          </button>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-slate-900/50 border border-slate-600 p-6"
        >
          <h3 className="font-pixel text-sm text-yellow-400 mb-4 text-center">BATTLE TIPS</h3>
          <div className="space-y-2 text-center">
            <p className="font-terminal text-xs text-slate-400">• Answer quickly and accurately to gain advantage</p>
            <p className="font-terminal text-xs text-slate-400">• ELO rating changes based on opponent strength</p>
            <p className="font-terminal text-xs text-slate-400">
              • Higher ELO opponents give more points when defeated
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
