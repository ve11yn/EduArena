"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Gamepad2, Zap, Brain, Clock } from "lucide-react"

const subjects = [
  { id: "math", name: "MATHEMATICS", icon: "🔢", color: "cyan" },
  { id: "bahasa", name: "BAHASA INDONESIA", icon: "📚", color: "blue" },
  { id: "english", name: "ENGLISH", icon: "�️", color: "purple" },
]

const difficulties = [
  { id: "beginner", name: "ROOKIE", color: "green" },
  { id: "intermediate", name: "WARRIOR", color: "yellow" },
  { id: "advanced", name: "MASTER", color: "red" },
]

export default function PlayPage() {
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("")
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const handleStartDuel = async () => {
    if (!selectedSubject || !selectedDifficulty || !user) return

    setLoading(true)
    try {
      // Get Firebase Auth token
      const token = await user.getIdToken()

      const response = await fetch("/api/matchmaking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: selectedSubject,
          difficulty: selectedDifficulty,
        }),
      })

      const data = await response.json()
      if (data.success) {
        router.push(`../app/duel/${data.duelId}`)
      }
    } catch (error) {
      console.error("Matchmaking error:", error)
    } finally {
      setLoading(false)
    }
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
          <p className="font-terminal text-xl text-cyan-300">Choose your battlefield and difficulty</p>
        </motion.div>

        {/* Topic Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-6 h-6 text-pink-400" />
            <h2 className="font-pixel text-xl text-pink-400 tracking-wider">SELECT SUBJECT</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <motion.button
                key={subject.id}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedSubject(subject.id)}
                className={`p-6 border-2 transition-all ${
                  selectedSubject === subject.id
                    ? `border-${subject.color}-400 bg-${subject.color}-400/20`
                    : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                }`}
              >
                <div className="text-4xl mb-4">{subject.icon}</div>
                <h3 className="font-pixel text-lg text-cyan-400 mb-2">{subject.name}</h3>
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Difficulty Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-yellow-400" />
            <h2 className="font-pixel text-xl text-yellow-400 tracking-wider">SELECT DIFFICULTY</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {difficulties.map((difficulty) => (
              <motion.button
                key={difficulty.id}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDifficulty(difficulty.id)}
                className={`p-6 border-2 transition-all ${
                  selectedDifficulty === difficulty.id
                    ? `border-${difficulty.color}-400 bg-${difficulty.color}-400/20`
                    : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                }`}
              >
                <h3 className="font-pixel text-lg text-cyan-400 mb-2">{difficulty.name}</h3>
                <p className="font-terminal text-sm text-cyan-300 capitalize">{difficulty.id} Level</p>
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent mt-4"></div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Start Battle Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartDuel}
            disabled={!selectedSubject || !selectedDifficulty || loading}
            className="retro-button font-pixel text-slate-900 px-12 py-4 text-lg tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 animate-spin" />
                FINDING OPPONENT...
              </div>
            ) : (
              "⚔️ START BATTLE"
            )}
          </motion.button>

          {selectedSubject && selectedDifficulty && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-terminal text-cyan-300 mt-4">
              Ready for {subjects.find((s) => s.id === selectedSubject)?.name} •{" "}
              {difficulties.find((d) => d.id === selectedDifficulty)?.name}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
