"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { startGame } from "@/lib/game-service"
import { Gamepad2, Zap, Brain, Clock, Users, Bot, Trophy, Target, Star, Lock, CheckCircle, Play, Heart } from "lucide-react"
import type { GameMode, TrainingLevelData } from "@/lib/game-modes"

const subjects = [
  { id: "math", name: "MATHEMATICS", icon: "🔢", color: "cyan" },
  { id: "bahasa", name: "BAHASA INDONESIA", icon: "📚", color: "blue" },
  { id: "english", name: "ENGLISH", icon: "🗣️", color: "purple" },
]

// Training levels structure with progress tracking (lives are now global)
const trainingLevels = {
  math: [
    { id: 1, name: "Basic Addition", difficulty: "beginner", unlocked: true, completed: false, description: "Learn simple addition", progress: 0, totalQuestions: 15 },
    { id: 2, name: "Basic Subtraction", difficulty: "beginner", unlocked: false, completed: false, description: "Master subtraction", progress: 0, totalQuestions: 15 },
    { id: 3, name: "Multiplication Basics", difficulty: "beginner", unlocked: false, completed: false, description: "Times tables training", progress: 0, totalQuestions: 15 },
    { id: 4, name: "Division Fundamentals", difficulty: "intermediate", unlocked: false, completed: false, description: "Division practice", progress: 0, totalQuestions: 15 },
    { id: 5, name: "Fractions", difficulty: "intermediate", unlocked: false, completed: false, description: "Work with fractions", progress: 0, totalQuestions: 15 },
    { id: 6, name: "Decimals", difficulty: "intermediate", unlocked: false, completed: false, description: "Decimal operations", progress: 0, totalQuestions: 15 },
    { id: 7, name: "Algebra Basics", difficulty: "advanced", unlocked: false, completed: false, description: "Introduction to algebra", progress: 0, totalQuestions: 15 },
    { id: 8, name: "Geometry", difficulty: "advanced", unlocked: false, completed: false, description: "Shapes and angles", progress: 0, totalQuestions: 15 },
  ],
  bahasa: [
    { id: 1, name: "Kata Dasar", difficulty: "beginner", unlocked: true, completed: false, description: "Vocabulary basics", progress: 0, totalQuestions: 15 },
    { id: 2, name: "Tata Bahasa", difficulty: "beginner", unlocked: false, completed: false, description: "Grammar rules", progress: 0, totalQuestions: 15 },
    { id: 3, name: "Kalimat", difficulty: "beginner", unlocked: false, completed: false, description: "Sentence structure", progress: 0, totalQuestions: 15 },
    { id: 4, name: "Paragraf", difficulty: "intermediate", unlocked: false, completed: false, description: "Paragraph writing", progress: 0, totalQuestions: 15 },
    { id: 5, name: "Puisi", difficulty: "intermediate", unlocked: false, completed: false, description: "Poetry analysis", progress: 0, totalQuestions: 15 },
    { id: 6, name: "Cerita", difficulty: "intermediate", unlocked: false, completed: false, description: "Story comprehension", progress: 0, totalQuestions: 15 },
    { id: 7, name: "Esai", difficulty: "advanced", unlocked: false, completed: false, description: "Essay writing", progress: 0, totalQuestions: 15 },
    { id: 8, name: "Sastra", difficulty: "advanced", unlocked: false, completed: false, description: "Literature study", progress: 0, totalQuestions: 15 },
  ],
  english: [
    { id: 1, name: "Basic Vocabulary", difficulty: "beginner", unlocked: true, completed: false, description: "Essential words", progress: 0, totalQuestions: 15 },
    { id: 2, name: "Grammar Basics", difficulty: "beginner", unlocked: false, completed: false, description: "Grammar fundamentals", progress: 0, totalQuestions: 15 },
    { id: 3, name: "Sentence Building", difficulty: "beginner", unlocked: false, completed: false, description: "Form sentences", progress: 0, totalQuestions: 15 },
    { id: 4, name: "Reading Skills", difficulty: "intermediate", unlocked: false, completed: false, description: "Comprehension practice", progress: 0, totalQuestions: 15 },
    { id: 5, name: "Writing Skills", difficulty: "intermediate", unlocked: false, completed: false, description: "Writing practice", progress: 0, totalQuestions: 15 },
    { id: 6, name: "Conversations", difficulty: "intermediate", unlocked: false, completed: false, description: "Speaking practice", progress: 0, totalQuestions: 15 },
    { id: 7, name: "Advanced Grammar", difficulty: "advanced", unlocked: false, completed: false, description: "Complex grammar", progress: 0, totalQuestions: 15 },
    { id: 8, name: "Literature", difficulty: "advanced", unlocked: false, completed: false, description: "Text analysis", progress: 0, totalQuestions: 15 },
  ],
}

const difficulties = [
  { id: "beginner", name: "ROOKIE", color: "green", description: "Basic questions" },
  { id: "intermediate", name: "WARRIOR", color: "yellow", description: "Moderate difficulty" },
  { id: "advanced", name: "MASTER", color: "red", description: "Advanced challenges" },
]

export default function PlayPage() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [showTrainingPath, setShowTrainingPath] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { user, userProfile } = useAuth()
  const router = useRouter()

  const handleStartGame = async () => {
    console.log('🎮 Starting game...', { gameMode, selectedSubject, selectedLevel })
    
    if (!selectedSubject || !userProfile || !user) return
    if (gameMode === "training" && !selectedLevel) return

    // Check if user has lives for training mode
    if (gameMode === "training" && (userProfile.lives === undefined || userProfile.lives <= 0)) {
      setError("You need at least 1 life to start training mode. Lives regenerate over time.")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Get user token for API authentication
      const userToken = await user.getIdToken()
      console.log('🔐 Got user token, starting game service...')

      // For training mode, use the level's difficulty and add training metadata
      let difficulty = selectedDifficulty
      let trainingLevelData: TrainingLevelData | undefined = undefined
      
      if (gameMode === "training" && selectedLevel) {
        const levels = trainingLevels[selectedSubject as keyof typeof trainingLevels]
        const level = levels.find(l => l.id === selectedLevel)
        difficulty = level?.difficulty || "beginner"
        trainingLevelData = {
          levelId: selectedLevel,
          levelName: level?.name || `Level ${selectedLevel}`,
          totalQuestions: 15,
        }
      }

      console.log('⚙️ Game config:', { mode: gameMode, subject: selectedSubject, difficulty })

      const result = await startGame(
        {
          mode: gameMode!,
          subject: selectedSubject as any,
          difficulty: difficulty as "beginner" | "intermediate" | "advanced",
          trainingLevel: trainingLevelData, // Pass training level info
        },
        userProfile,
        userToken, // Pass the user token for API authentication
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
    setSelectedLevel(null)
    setShowTrainingPath(false)
    setError("")
  }

  const handleTrainingModeSelect = () => {
    setGameMode("training")
    setShowTrainingPath(true)
  }

  const handleLevelSelect = (levelId: number) => {
    const levels = trainingLevels[selectedSubject as keyof typeof trainingLevels]
    const level = levels.find(l => l.id === levelId)
    if (level && level.unlocked) {
      setSelectedLevel(levelId)
    }
  }

  const getLevelStatus = (level: any) => {
    if (level.completed) return "completed"
    if (level.unlocked) return "unlocked"
    return "locked"
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "text-green-400 border-green-400"
      case "intermediate": return "text-yellow-400 border-yellow-400"
      case "advanced": return "text-red-400 border-red-400"
      default: return "text-cyan-400 border-cyan-400"
    }
  }

  const canStartGame = () => {
    if (!selectedSubject) return false
    if (gameMode === "training" && !selectedLevel) return false
    if (gameMode === "pvp") return true
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
                onClick={handleTrainingModeSelect}
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
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="font-terminal text-sm text-red-400">Global Lives System</span>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Subject Selection */}
        {gameMode && !selectedSubject && !showTrainingPath && (
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

        {/* Training Path View */}
        {gameMode === "training" && showTrainingPath && !selectedSubject && (
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

        {/* Training Levels Path */}
        {gameMode === "training" && selectedSubject && !selectedLevel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6 text-purple-400" />
              <h2 className="font-pixel text-xl text-purple-400 tracking-wider">
                {subjects.find(s => s.id === selectedSubject)?.name} TRAINING PATH
              </h2>
              <div className="ml-auto">
                <button
                  onClick={() => setSelectedSubject("")}
                  className="font-pixel text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  ← BACK
                </button>
              </div>
            </div>
            
            {/* Progress Overview */}
            <div className="bg-slate-800/80 border-2 border-purple-400 p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-pixel text-sm text-purple-400">PROGRESS</span>
                    <span className="font-pixel text-sm text-cyan-400">
                      {trainingLevels[selectedSubject as keyof typeof trainingLevels].filter(l => l.completed).length} / {trainingLevels[selectedSubject as keyof typeof trainingLevels].length}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(trainingLevels[selectedSubject as keyof typeof trainingLevels].filter(l => l.completed).length / trainingLevels[selectedSubject as keyof typeof trainingLevels].length) * 100}%` 
                      }}
                    />
                  </div>
                </div>
                
                {/* Global Lives Display */}
                <div className="ml-6 flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg border border-red-400/30">
                  <span className="font-pixel text-xs text-red-400">LIVES</span>
                  <div className="flex items-center gap-1">
                    {[...Array(3)].map((_, i) => (
                      <Heart 
                        key={i} 
                        className={`w-4 h-4 ${i < (userProfile?.lives || 0) ? 'text-red-400 fill-red-400' : 'text-slate-600'}`} 
                      />
                    ))}
                  </div>
                  <span className="font-pixel text-xs text-cyan-400">{userProfile?.lives || 0}/3</span>
                </div>
              </div>
            </div>

            {/* Levels Path */}
            <div className="relative">
              {/* Connecting Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 via-cyan-400 to-green-400 transform -translate-x-1/2 z-0"></div>
              
              <div className="space-y-8">
                {trainingLevels[selectedSubject as keyof typeof trainingLevels].map((level, index) => {
                  const status = getLevelStatus(level)
                  const isLeft = index % 2 === 0
                  
                  return (
                    <motion.div
                      key={level.id}
                      initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center ${isLeft ? 'justify-start' : 'justify-end'} relative z-10`}
                    >
                      <div className={`w-1/2 ${isLeft ? 'pr-8' : 'pl-8'}`}>
                        <motion.button
                          whileHover={status !== "locked" ? { scale: 1.02, y: -2 } : {}}
                          whileTap={status !== "locked" ? { scale: 0.98 } : {}}
                          onClick={() => handleLevelSelect(level.id)}
                          disabled={status === "locked"}
                          className={`w-full p-4 border-2 transition-all relative ${
                            status === "completed" 
                              ? "bg-green-900/50 border-green-400 text-green-300" 
                              : status === "unlocked" 
                              ? `bg-slate-800/50 hover:bg-slate-700/50 ${getDifficultyColor(level.difficulty)}`
                              : "bg-slate-900/50 border-slate-600 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          {/* Level number circle */}
                          <div className={`absolute -top-3 ${isLeft ? '-right-3' : '-left-3'} w-8 h-8 rounded-full border-2 flex items-center justify-center font-pixel text-xs ${
                            status === "completed" 
                              ? "bg-green-400 border-green-600 text-black" 
                              : status === "unlocked" 
                              ? "bg-cyan-400 border-cyan-600 text-black"
                              : "bg-slate-600 border-slate-700 text-slate-400"
                          }`}>
                            {status === "completed" ? <CheckCircle className="w-4 h-4" /> : level.id}
                          </div>
                          
                          <div className={`flex items-center gap-3 ${isLeft ? '' : 'flex-row-reverse'}`}>
                            <div className={`flex-1 ${isLeft ? 'text-left' : 'text-right'}`}>
                              <h3 className="font-pixel text-sm mb-1">{level.name}</h3>
                              <p className="font-terminal text-xs opacity-80 mb-2">{level.description}</p>
                              
                              {/* Progress Bar */}
                              {level.progress > 0 && (
                                <div className="mb-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-terminal text-xs opacity-60">Progress</span>
                                    <span className="font-terminal text-xs opacity-60">{level.progress}/{level.totalQuestions}</span>
                                  </div>
                                  <div className="w-full h-1 bg-slate-700 rounded-full">
                                    <div 
                                      className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full transition-all duration-500"
                                      style={{ width: `${(level.progress / level.totalQuestions) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              <span className={`inline-block px-2 py-1 rounded text-xs font-pixel ${
                                level.difficulty === "beginner" ? "bg-green-900/50 text-green-400" :
                                level.difficulty === "intermediate" ? "bg-yellow-900/50 text-yellow-400" :
                                "bg-red-900/50 text-red-400"
                              }`}>
                                {level.difficulty.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-2xl">
                              {status === "completed" ? "✅" : 
                               status === "unlocked" ? "🎯" : "🔒"}
                            </div>
                          </div>
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Start Game Button */}
        {((gameMode === "pvp" && selectedSubject) || (gameMode === "training" && selectedLevel)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <div className="bg-slate-800/80 border-2 border-cyan-400 p-6 mb-6">
              <h3 className="font-pixel text-lg text-cyan-400 mb-4">LEVEL SETUP</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="font-pixel text-sm text-pink-400 mb-1">MODE</div>
                  <div className="font-terminal text-cyan-300">
                    {gameMode === "pvp" ? "PLAYER VS PLAYER" : "TRAINING"}
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
                    {gameMode === "pvp" ? "MATCHING" : "LEVEL"}
                  </div>
                  <div className="font-terminal text-cyan-300">
                    {gameMode === "pvp" 
                      ? "ELO-BASED" 
                      : selectedLevel 
                        ? trainingLevels[selectedSubject as keyof typeof trainingLevels].find(l => l.id === selectedLevel)?.name
                        : "NONE"
                    }
                  </div>
                </div>
                {gameMode === "training" && (
                  <div>
                    <div className="font-pixel text-sm text-pink-400 mb-1">GLOBAL LIVES</div>
                    <div className="font-terminal text-cyan-300 flex items-center justify-center gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(3)].map((_, i) => (
                          <Heart 
                            key={i} 
                            className={`w-3 h-3 ${i < (userProfile?.lives || 0) ? 'text-red-400 fill-red-400' : 'text-slate-600'}`} 
                          />
                        ))}
                      </div>
                      <span>{userProfile?.lives || 0}/3</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  if (gameMode === "training") {
                    setSelectedLevel(null)
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
                  <>{gameMode === "pvp" ? "⚔️ FIND MATCH" : "🎯 START LEVEL"}</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
