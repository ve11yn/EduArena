"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getDuelWithUsers, subscribeToDuel } from "@/lib/firebase/firestore"
import { Clock, User, Trophy, Zap } from "lucide-react"
import type { DuelWithUsers, QuizQuestion } from "@/lib/firebase/firestore"

interface DuelPageProps {
  params: {
    id: string
  }
}

export default function DuelPage({ params }: DuelPageProps) {
  const [duel, setDuel] = useState<DuelWithUsers | null>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [startTime, setStartTime] = useState<number | null>(null)

  const { user, userProfile } = useAuth()
  const router = useRouter()

  const fetchDuel = useCallback(async () => {
    try {
      const duelData = await getDuelWithUsers(params.id)
      if (!duelData) {
        router.push("/dashboard")
        return
      }

      setDuel(duelData)
      setLoading(false)

      // Start timer when both players are present and quiz is ready
      if (duelData.status === "in_progress" && duelData.quizData && !startTime) {
        setStartTime(Date.now())
      }
    } catch (error) {
      console.error("Error fetching duel:", error)
      router.push("/dashboard")
    }
  }, [params.id, router, startTime])

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    fetchDuel()

    // Subscribe to real-time updates
    const unsubscribe = subscribeToDuel(params.id, (updatedDuel) => {
      if (updatedDuel) {
        setDuel((prev) => {
          if (!prev) return null
          return {
            ...updatedDuel,
            player1: prev.player1,
            player2: prev.player2,
          }
        })

        // Start timer when both players are present and quiz is ready
        if (updatedDuel.status === "in_progress" && updatedDuel.quizData && !startTime) {
          setStartTime(Date.now())
        }
      }
    })

    return () => unsubscribe()
  }, [user, router, fetchDuel, params.id, startTime])

  // Timer countdown
  useEffect(() => {
    if (!startTime || submitted || timeLeft <= 0) return

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = Math.max(0, 30 - elapsed)
      setTimeLeft(remaining)

      if (remaining === 0) {
        handleSubmitAnswer()
      }
    }, 100)

    return () => clearInterval(timer)
  }, [startTime, submitted, timeLeft])

  const handleSubmitAnswer = async () => {
    if (submitted || !startTime || !user) return

    setSubmitted(true)
    const timeElapsed = Date.now() - startTime

    try {
      const token = await user.getIdToken()

      const response = await fetch("/api/submit-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          duelId: params.id,
          answer: selectedAnswer?.toString() || "0",
          timeElapsed,
        }),
      })

      const data = await response.json()
      if (data.success && data.completed) {
        setResult(data.result)
      }
    } catch (error) {
      console.error("Submit answer error:", error)
    }
  }

  const isCurrentUserPlayer1 = userProfile?.id === duel?.player1Id
  const opponent = isCurrentUserPlayer1 ? duel?.player2 : duel?.player1
  const hasOpponentAnswered = isCurrentUserPlayer1
    ? duel?.player2Answer !== undefined
    : duel?.player1Answer !== undefined

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-400 border-t-transparent"
        />
        <span className="ml-4 font-pixel text-cyan-400 text-lg">LOADING BATTLE...</span>
      </div>
    )
  }

  if (!duel || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-pixel text-2xl text-red-400 mb-4">BATTLE NOT FOUND</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="retro-button font-pixel text-slate-900 px-6 py-3"
          >
            RETURN TO BASE
          </button>
        </div>
      </div>
    )
  }

  // Waiting for opponent
  if (duel.status === "waiting" || !duel.player2) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-slate-800/80 border-2 border-cyan-400 p-8 max-w-md"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-6"
          />
          <h1 className="font-pixel text-xl text-cyan-400 mb-4">SEARCHING FOR OPPONENT</h1>
          <p className="font-terminal text-cyan-300 mb-6">
            Topic: {duel.topic.toUpperCase()} • {duel.difficulty.toUpperCase()}
          </p>
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
        </motion.div>
      </div>
    )
  }

  // Show results
  if (result) {
    const isWinner = result.winnerId === userProfile.id
    const isDraw = !result.winnerId

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800/90 border-2 border-cyan-400 p-8 max-w-2xl w-full"
        >
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
              {isWinner ? (
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              ) : isDraw ? (
                <Zap className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
              ) : (
                <div className="w-16 h-16 bg-red-400 mx-auto mb-4 flex items-center justify-center text-2xl">💀</div>
              )}
            </motion.div>

            <h1 className="font-pixel text-3xl text-cyan-400 mb-4">
              {isWinner ? "VICTORY!" : isDraw ? "DRAW!" : "DEFEAT!"}
            </h1>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className={`p-4 border-2 ${isCurrentUserPlayer1 ? "border-cyan-400" : "border-slate-600"}`}>
                <h3 className="font-pixel text-sm text-cyan-400 mb-2">{duel.player1.username}</h3>
                <p className="font-terminal text-lg">{result.player1Correct ? "✅ CORRECT" : "❌ WRONG"}</p>
                <p className="font-terminal text-sm text-cyan-300">
                  ELO: {result.eloChanges?.player?.newElo || duel.player1.elo}
                  <span className={result.eloChanges?.player?.change > 0 ? "text-green-400" : "text-red-400"}>
                    {result.eloChanges?.player?.change > 0 ? " +" : " "}
                    {result.eloChanges?.player?.change || 0}
                  </span>
                </p>
              </div>

              <div className={`p-4 border-2 ${!isCurrentUserPlayer1 ? "border-cyan-400" : "border-slate-600"}`}>
                <h3 className="font-pixel text-sm text-cyan-400 mb-2">{duel.player2?.username}</h3>
                <p className="font-terminal text-lg">{result.player2Correct ? "✅ CORRECT" : "❌ WRONG"}</p>
                <p className="font-terminal text-sm text-cyan-300">
                  ELO: {result.eloChanges?.opponent?.newElo || duel.player2?.elo}
                  <span className={result.eloChanges?.opponent?.change > 0 ? "text-green-400" : "text-red-400"}>
                    {result.eloChanges?.opponent?.change > 0 ? " +" : " "}
                    {result.eloChanges?.opponent?.change || 0}
                  </span>
                </p>
              </div>
            </div>

            {result.explanation && (
              <div className="bg-slate-900/50 border border-cyan-400/50 p-4 mb-6">
                <h4 className="font-pixel text-sm text-yellow-400 mb-2">EXPLANATION</h4>
                <p className="font-terminal text-cyan-300">{result.explanation}</p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button onClick={() => router.push("/play")} className="retro-button font-pixel text-slate-900 px-6 py-3">
                ⚔️ BATTLE AGAIN
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-slate-800/80 border-2 border-cyan-400 text-cyan-400 font-pixel px-6 py-3 hover:bg-cyan-400/10 transition-all"
              >
                📊 DASHBOARD
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Main duel interface
  const quiz = duel.quizData as QuizQuestion

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with players and timer */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8 bg-slate-800/80 border-2 border-cyan-400 p-6"
        >
          <div className="flex items-center gap-4">
            <User className="w-8 h-8 text-cyan-400" />
            <div>
              <h3 className="font-pixel text-lg text-cyan-400">{userProfile.username}</h3>
              <p className="font-terminal text-cyan-300">ELO: {userProfile.elo}</p>
            </div>
          </div>

          <div className="text-center">
            <motion.div
              animate={{ scale: timeLeft <= 5 ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.5, repeat: timeLeft <= 5 ? Number.POSITIVE_INFINITY : 0 }}
              className={`font-pixel text-3xl mb-2 ${timeLeft <= 5 ? "text-red-400" : "text-yellow-400"}`}
            >
              {timeLeft}s
            </motion.div>
            <Clock className="w-6 h-6 text-yellow-400 mx-auto" />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <h3 className="font-pixel text-lg text-pink-400">{opponent?.username || "WAITING..."}</h3>
              <p className="font-terminal text-cyan-300">ELO: {opponent?.elo || "---"}</p>
            </div>
            <User className="w-8 h-8 text-pink-400" />
            {hasOpponentAnswered && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 bg-green-400 rounded-full" />
            )}
          </div>
        </motion.div>

        {/* Question */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-8 mb-8"
        >
          <div className="text-center mb-8">
            <h2 className="font-pixel text-sm text-cyan-400 mb-4 tracking-wider">
              {duel.topic.toUpperCase()} • {duel.difficulty.toUpperCase()}
            </h2>
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-6"></div>
            <p className="font-terminal text-xl text-white leading-relaxed">{quiz?.question}</p>
          </div>
        </motion.div>

        {/* Answer Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <AnimatePresence>
            {quiz?.options.map((option, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: submitted ? 1 : 1.02, y: submitted ? 0 : -2 }}
                whileTap={{ scale: submitted ? 1 : 0.98 }}
                onClick={() => !submitted && setSelectedAnswer(index)}
                disabled={submitted}
                className={`p-6 border-2 font-terminal text-lg transition-all ${
                  selectedAnswer === index
                    ? "border-cyan-400 bg-cyan-400/20 text-cyan-400"
                    : "border-slate-600 bg-slate-800/50 text-cyan-300 hover:border-slate-500"
                } ${submitted ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
              >
                <span className="font-pixel text-sm text-cyan-400 mr-3">{String.fromCharCode(65 + index)}.</span>
                {option}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <button
            onClick={handleSubmitAnswer}
            disabled={submitted || selectedAnswer === null}
            className="retro-button font-pixel text-slate-900 px-12 py-4 text-lg tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitted ? "ANSWER SUBMITTED" : "⚡ SUBMIT ANSWER"}
          </button>

          {submitted && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-terminal text-cyan-300 mt-4">
              {hasOpponentAnswered ? "Both answers submitted! Calculating results..." : "Waiting for opponent..."}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
