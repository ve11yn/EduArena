"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { startGame } from "@/lib/game-service"
import { Gamepad2, Zap, Brain, Clock, Users, Bot, Trophy, Target } from "lucide-react"
import type { GameMode } from "@/lib/game-modes"

const subjects = [
  { id: "math", name: "MATHEMATICS", icon: "🔢", color: "cyan" },
  { id: "bahasa", name: "BAHASA INDONESIA", icon: "📚", color: "blue" },
  { id: "english", name: "ENGLISH", icon: "🗣️", color: "purple" },
]

const difficulties = [
  { id: "beginner", name: "ROOKIE", color: "green", description: "Basic questions" },
  { id: "intermediate", name: "WARRIOR", color: "yellow", description: "Moderate difficulty" },
  { id: "advanced", name: "MASTER", color: "red", description: "Advanced challenges" },
]

export default function PlayPage() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { user, userProfile } = useAuth()
  const router = useRouter()

  const handleStartGame = async () => {
    if (!selectedSubject || !userProfile) return
    if (gameMode === "training" && !selectedDifficulty) return

    setLoading(true)
    setError("")

    try {
      const result = await startGame(
        {
          mode: gameMode!,
          subject: selectedSubject as any,
          difficulty: selectedDifficulty as "beginner" | "intermediate" | "advanced",
        },
        userProfile,
      )

      if (result.success && result.duelId) {
        router.push(`/duel/${result.duelId}`)
      } else {
        setError(result.error || "Failed to start game")
      }
    } catch (error) {
      console.error("Game start error:", error)
      setError("Failed to start game. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetSelection = () => {
    setGameMode(null)
    setSelectedSubject("")
    setSelectedDifficulty("")
    setError("")
  }

  const canStartGame = () => {
    if (!selectedSubject) return false
    if (gameMode === "training" && !selectedDifficulty) return false
    return true
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

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Gamepad2 className="w-12 h-12 text-cyan-400" />
            <h1 className="font-pixel text-4xl text-cyan-400 tracking-wider">BATTLE ARENA</h1>
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-4"></div>
          <p className="font-terminal text-xl text-cyan-300">Choose your game mode and challenge</p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/20 border-2 border-red-400 p-4 mb-6 text-center"
          >
            <p className="font-pixel text-red-300 text-sm">ERROR: {error}</p>
          </motion.div>
        )}

        {/* Game Mode Selection */}
        {!gameMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6 text-pink-400" />
              <h2 className="font-pixel text-xl text-pink-400 tracking-wider">SELECT GAME MODE</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setGameMode("pvp")}
                className="p-8 border-2 border-cyan-400 bg-slate-800/50 hover:bg-cyan-400/10 transition-all"
              >
                <Users className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <h3 className="font-pixel text-xl text-cyan-400 mb-4">PLAYER VS PLAYER</h3>
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-green-400" />
                    <span className="font-terminal text-sm text-green-400">ELO Rating Changes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="font-terminal text-sm text-blue-400">Real Opponents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="font-terminal text-sm text-yellow-400">ELO-Based Matching</span>
                  </div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setGameMode("training")}
                className="p-8 border-2 border-purple-400 bg-slate-800/50 hover:bg-purple-400/10 transition-all"
              >
                <Bot className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h3 className="font-pixel text-xl text-purple-400 mb-4">TRAINING VS BOT</h3>
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-green-400" />
                    <span className="font-terminal text-sm text-green-400">Practice Mode</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span className="font-terminal text-sm text-blue-400">AI Opponents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-yellow-400" />
                    <span className="font-terminal text-sm text-yellow-400">No ELO Risk</span>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Subject Selection */}
        {gameMode && !selectedSubject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <Brain className="w-6 h-6 text-pink-400" />
              <h2 className="font-pixel text-xl text-pink-400 tracking-wider">SELECT SUBJECT</h2>
              <div className="ml-auto">
                <button
                  onClick={resetSelection}
                  className="font-pixel text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  ← BACK
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <motion.button
                  key={subject.id}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSubject(subject.id)}
                  className="p-6 border-2 border-slate-600 bg-slate-800/50 hover:border-slate-500 transition-all"
                >
                  <div className="text-4xl mb-4">{subject.icon}</div>
                  <h3 className="font-pixel text-lg text-cyan-400 mb-2">{subject.name}</h3>
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Difficulty Selection (Training Mode Only) */}
        {gameMode === "training" && selectedSubject && !selectedDifficulty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h2 className="font-pixel text-xl text-yellow-400 tracking-wider">SELECT DIFFICULTY</h2>
              <div className="ml-auto">
                <button
                  onClick={() => setSelectedSubject("")}
                  className="font-pixel text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  ← BACK
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {difficulties.map((difficulty) => (
                <motion.button
                  key={difficulty.id}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDifficulty(difficulty.id)}
                  className="p-6 border-2 border-slate-600 bg-slate-800/50 hover:border-slate-500 transition-all"
                >
                  <h3 className="font-pixel text-lg text-cyan-400 mb-2">{difficulty.name}</h3>
                  <p className="font-terminal text-sm text-cyan-300 mb-4">{difficulty.description}</p>
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Start Game Button */}
        {gameMode && selectedSubject && (gameMode === "pvp" || selectedDifficulty) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <div className="bg-slate-800/80 border-2 border-cyan-400 p-6 mb-6">
              <h3 className="font-pixel text-lg text-cyan-400 mb-4">GAME SETUP</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="font-pixel text-sm text-pink-400 mb-1">MODE</div>
                  <div className="font-terminal text-cyan-300">
                    {gameMode === "pvp" ? "PLAYER VS PLAYER" : "TRAINING VS BOT"}
                  </div>
                </div>
                <div>
                  <div className="font-pixel text-sm text-pink-400 mb-1">SUBJECT</div>
                  <div className="font-terminal text-cyan-300">
                    {subjects.find((s) => s.id === selectedSubject)?.name}
                  </div>
                </div>
                <div>
                  <div className="font-pixel text-sm text-pink-400 mb-1">
                    {gameMode === "pvp" ? "MATCHING" : "DIFFICULTY"}
                  </div>
                  <div className="font-terminal text-cyan-300">
                    {gameMode === "pvp" ? "ELO-BASED" : difficulties.find((d) => d.id === selectedDifficulty)?.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  if (gameMode === "training") {
                    setSelectedDifficulty("")
                  } else {
                    setSelectedSubject("")
                  }
                }}
                className="bg-slate-800/80 border-2 border-slate-600 text-slate-400 font-pixel px-6 py-3 text-sm hover:border-slate-500 transition-colors"
              >
                ← BACK
              </button>

              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartGame}
                disabled={loading || !canStartGame()}
                className="retro-button font-pixel text-slate-900 px-12 py-4 text-lg tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 animate-spin" />
                    {gameMode === "pvp" ? "FINDING OPPONENT..." : "STARTING TRAINING..."}
                  </div>
                ) : (
                  <>{gameMode === "pvp" ? "⚔️ FIND MATCH" : "🤖 START TRAINING"}</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
