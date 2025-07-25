"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getDuelWithUsers, subscribeToDuel, getUserEloForSubject } from "@/lib/firebase/firestore"
import { submitAnswer } from "@/lib/duel-service"
import { Clock, User, Trophy, Zap, Bot, ArrowRight } from "lucide-react"
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
  const [waitingForBot, setWaitingForBot] = useState(false)
  const [error, setError] = useState("")
  const [showNextQuestion, setShowNextQuestion] = useState(false)

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
      setError("Failed to load duel")
      setTimeout(() => router.push("/dashboard"), 3000)
    }
  }, [params.id, router, startTime])

  useEffect(() => {
    if (!user || !userProfile) {
      router.push("/login")
      return
    }

    fetchDuel()

    // Subscribe to real-time updates
    const unsubscribe = subscribeToDuel(params.id, (updatedDuel) => {
      if (updatedDuel) {
        setDuel((prev) => {
          if (!prev) return null

          // Check if question index changed (next question)
          if (prev.currentQuestionIndex !== updatedDuel.currentQuestionIndex) {
            setShowNextQuestion(true)
            resetForNextQuestion()

            // Hide next question indicator after 2 seconds
            setTimeout(() => setShowNextQuestion(false), 2000)
          }

          // Check if bot answered (for training mode)
          if (
            updatedDuel.isTraining &&
            updatedDuel.player2Answers &&
            updatedDuel.player2Answers[updatedDuel.currentQuestionIndex] !== undefined &&
            waitingForBot
          ) {
            setWaitingForBot(false)
          }

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
  }, [user, userProfile, router, fetchDuel, params.id, startTime])

  // Add this function to reset state for next question
  const resetForNextQuestion = () => {
    setSubmitted(false)
    setSelectedAnswer(null)
    setWaitingForBot(false)
    setTimeLeft(30)
    setStartTime(Date.now())
    setError("")
  }

  // Update the handleSubmitAnswer function to better handle training mode:
  const handleSubmitAnswer = async () => {
    if (submitted || !startTime || !userProfile || selectedAnswer === null) return

    // Log the answer submission for debugging
    const currentQuestion = duel?.quizData?.[duel?.currentQuestionIndex ?? 0];
    if (currentQuestion && duel) {
      console.log(`🎯 FRONTEND: Submitting answer for question ${duel.currentQuestionIndex + 1}`);
      console.log(`   Question: ${currentQuestion.question.substring(0, 50)}...`);
      console.log(`   Selected answer index: ${selectedAnswer}`);
      console.log(`   Selected option: "${currentQuestion.options[selectedAnswer] || 'Invalid'}"`);
      console.log(`   Correct answer index: ${currentQuestion.correct_answer}`);
      console.log(`   Correct option: "${currentQuestion.options[currentQuestion.correct_answer] || 'Invalid'}"`);
      console.log(`   Is correct: ${selectedAnswer === currentQuestion.correct_answer}`);
    }

    setSubmitted(true)
    setError("")
    const timeElapsed = Date.now() - startTime

    try {
      const result = await submitAnswer(params.id, selectedAnswer.toString(), timeElapsed, userProfile.id)

      if (result.success) {
        console.log(`✅ FRONTEND: Answer submitted successfully`);
        if (result.waitingForBot) {
          setWaitingForBot(true)
        } else if (result.nextQuestion) {
          // Next question will be handled by real-time listener
          console.log("Moving to next question...")
        } else if (result.completed && result.result) {
          setResult(result.result)
        }
      } else {
        console.error(`❌ FRONTEND: Answer submission failed:`, result.error);
        setError(result.error || "Failed to submit answer")
        setSubmitted(false)
      }
    } catch (error) {
      console.error("Submit answer error:", error)
      setError("Failed to submit answer")
      setSubmitted(false)
    }
  }

  // Update the timer reset logic:
  useEffect(() => {
    if (!startTime || submitted || timeLeft <= 0 || showNextQuestion) return

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = Math.max(0, 30 - elapsed)
      setTimeLeft(remaining)

      if (remaining === 0) {
        handleSubmitAnswer()
      }
    }, 100)

    return () => clearInterval(timer)
  }, [startTime, submitted, timeLeft, showNextQuestion])

  const isCurrentUserPlayer1 = userProfile?.id === duel?.player1Id
  const opponent = isCurrentUserPlayer1 ? duel?.player2 : duel?.player1
  const hasOpponentAnswered = isCurrentUserPlayer1
    ? duel?.player2Answers && duel?.player2Answers[duel.currentQuestionIndex] !== undefined
    : duel?.player1Answers && duel?.player1Answers[duel.currentQuestionIndex] !== undefined

  const isTrainingMode = duel?.isTraining || false
  const isBot = opponent?.id?.startsWith("bot_") || false

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full"
        />
        <span className="ml-4 font-pixel text-cyan-400 text-lg">LOADING BATTLE...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-red-900/80 border-2 border-red-400 p-8 max-w-md">
          <h1 className="font-pixel text-xl text-red-400 mb-4">ERROR</h1>
          <p className="font-terminal text-red-300 mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="retro-button font-pixel text-slate-900 px-6 py-3"
          >
            RETURN TO DASHBOARD
          </button>
        </div>
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

  // Waiting for opponent (PvP only)
  if (duel.status === "waiting" || (!duel.player2 && !isTrainingMode)) {
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
            Topic: {duel.subject.toUpperCase()}
            {duel.difficulty && ` • ${duel.difficulty.toUpperCase()}`}
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
          className="bg-slate-800/90 border-2 border-cyan-400 p-8 max-w-3xl w-full"
        >
          <div className="text-center mb-8">
            {/* Game Mode Indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {isTrainingMode ? (
                <>
                  <Bot className="w-5 h-5 text-purple-400" />
                  <span className="font-pixel text-sm text-purple-400">TRAINING MODE</span>
                </>
              ) : (
                <>
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="font-pixel text-sm text-yellow-400">RANKED MATCH</span>
                </>
              )}
            </div>

            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
              {isWinner ? (
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              ) : isDraw ? (
                <Zap className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
              ) : (
                <div className="w-16 h-16 bg-red-400 mx-auto mb-4 flex items-center justify-center text-2xl rounded">
                  💀
                </div>
              )}
            </motion.div>

            <h1 className="font-pixel text-3xl text-cyan-400 mb-4">
              {isWinner ? "VICTORY!" : isDraw ? "DRAW!" : "DEFEAT!"}
            </h1>

            {/* Score Display */}
            <div className="bg-slate-900/50 border border-cyan-400/50 p-4 mb-6">
              <h3 className="font-pixel text-lg text-cyan-400 mb-4">FINAL SCORE</h3>
              <div className="flex justify-center items-center gap-8">
                <div className="text-center">
                  <div className="font-pixel text-2xl text-cyan-400">{result.player1Score}</div>
                  <div className="font-terminal text-sm text-cyan-300">{duel.player1.username}</div>
                </div>
                <div className="font-pixel text-xl text-slate-400">VS</div>
                <div className="text-center">
                  <div className="font-pixel text-2xl text-pink-400">{result.player2Score}</div>
                  <div className="font-terminal text-sm text-cyan-300">{duel.player2?.username}</div>
                </div>
              </div>
              <div className="font-terminal text-xs text-slate-400 mt-2">OUT OF {result.totalQuestions} QUESTIONS</div>
            </div>

            {/* Question Results */}
            <div className="bg-slate-900/50 border border-cyan-400/50 p-4 mb-6">
              <h4 className="font-pixel text-sm text-yellow-400 mb-3">QUESTION RESULTS</h4>
              <div className="grid grid-cols-1 gap-2">
                {result.player1Answers.map((correct: boolean, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                    <span className="font-terminal text-sm text-cyan-300">Question {index + 1}</span>
                    <div className="flex gap-4">
                      <span className={`font-terminal text-sm ${correct ? "text-green-400" : "text-red-400"}`}>
                        {duel.player1.username}: {correct ? "✅" : "❌"}
                      </span>
                      <span
                        className={`font-terminal text-sm ${result.player2Answers[index] ? "text-green-400" : "text-red-400"}`}
                      >
                        {duel.player2?.username}: {result.player2Answers[index] ? "✅" : "❌"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ELO Changes */}
            {!isTrainingMode && result.eloChanges && (
              <div className="bg-slate-900/50 border border-cyan-400/50 p-4 mb-6">
                <h4 className="font-pixel text-sm text-yellow-400 mb-3">ELO CHANGES</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="font-terminal text-sm text-cyan-300 mb-1">{duel.player1.username}</div>
                    <div className="font-pixel text-lg text-cyan-400">{result.eloChanges.player.newElo}</div>
                    <div
                      className={`font-terminal text-sm ${result.eloChanges.player.change >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {result.eloChanges.player.change >= 0 ? "+" : ""}
                      {result.eloChanges.player.change}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-terminal text-sm text-cyan-300 mb-1">{duel.player2?.username}</div>
                    <div className="font-pixel text-lg text-pink-400">{result.eloChanges.opponent.newElo}</div>
                    <div
                      className={`font-terminal text-sm ${result.eloChanges.opponent.change >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {result.eloChanges.opponent.change >= 0 ? "+" : ""}
                      {result.eloChanges.opponent.change}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button onClick={() => router.push("/play")} className="retro-button font-pixel text-slate-900 px-6 py-3">
                {isTrainingMode ? "🤖 TRAIN AGAIN" : "⚔️ BATTLE AGAIN"}
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

  // Next Question Indicator
  if (showNextQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="text-center bg-slate-800/80 border-2 border-green-400 p-8 max-w-md"
        >
          <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}>
            <ArrowRight className="w-16 h-16 text-green-400 mx-auto mb-4" />
          </motion.div>
          <h1 className="font-pixel text-xl text-green-400 mb-4">BOTH CORRECT!</h1>
          <p className="font-terminal text-green-300 mb-4">Moving to next question...</p>
          <div className="font-pixel text-sm text-cyan-400">
            QUESTION {duel.currentQuestionIndex + 1} OF {duel.maxQuestions}
          </div>
        </motion.div>
      </div>
    )
  }

  // Main duel interface
  const currentQuestion = duel.quizData?.[duel.currentQuestionIndex] as QuizQuestion

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
              <p className="font-terminal text-cyan-300">
                ELO: {getUserEloForSubject(userProfile.elo, userProfile.preferredSubject)}
              </p>
              <p className="font-terminal text-xs text-green-400">
                Score: {isCurrentUserPlayer1 ? duel.player1Score : duel.player2Score}
              </p>
            </div>
          </div>

          <div className="text-center">
            {/* Game Mode Indicator */}
            <div className="flex items-center justify-center gap-2 mb-2">
              {isTrainingMode ? (
                <>
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span className="font-pixel text-xs text-purple-400">TRAINING</span>
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="font-pixel text-xs text-yellow-400">RANKED</span>
                </>
              )}
            </div>

            {/* Question Progress */}
            <div className="font-pixel text-xs text-slate-400 mb-2">
              Q{duel.currentQuestionIndex + 1}/{duel.maxQuestions}
            </div>

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
              <div className="flex items-center gap-2 justify-end mb-1">
                <h3 className="font-pixel text-lg text-pink-400">{opponent?.username || "WAITING..."}</h3>
                {isBot && <Bot className="w-5 h-5 text-purple-400" />}
              </div>
              <p className="font-terminal text-cyan-300">
                ELO: {opponent ? getUserEloForSubject(opponent.elo, userProfile.preferredSubject) : "---"}
              </p>
              <p className="font-terminal text-xs text-green-400">
                Score: {isCurrentUserPlayer1 ? duel.player2Score : duel.player1Score}
              </p>
            </div>
            <User className="w-8 h-8 text-pink-400" />
            {(hasOpponentAnswered || waitingForBot) && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 bg-green-400 rounded-full" />
            )}
          </div>
        </motion.div>

        {/* Question */}
        <motion.div
          key={`question-${duel.currentQuestionIndex}`} // Better key for re-animation
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-8 mb-8"
        >
          <div className="text-center mb-8">
            <h2 className="font-pixel text-sm text-cyan-400 mb-4 tracking-wider">
              {duel.subject.toUpperCase()}
              {duel.difficulty && ` • ${duel.difficulty.toUpperCase()}`}
            </h2>
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-6"></div>
            <p className="font-terminal text-xl text-white leading-relaxed">{currentQuestion?.question}</p>
          </div>
        </motion.div>

        {/* Answer Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <AnimatePresence mode="wait">
            {currentQuestion?.options.map((option, index) => (
              <motion.button
                key={`q${duel.currentQuestionIndex}-opt${index}`} // Better key
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
              {waitingForBot
                ? "Bot is thinking..."
                : hasOpponentAnswered
                  ? "Both answers submitted! Processing..."
                  : isTrainingMode
                    ? "Waiting for bot response..."
                    : "Waiting for opponent..."}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
