"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, Clock, BookOpen, Calculator, Globe } from "lucide-react"
import type { SubjectElo } from "@/lib/firebase/auth"

export type Subject = keyof SubjectElo

interface PlacementQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  difficulty: 'easy' | 'medium' | 'hard'
  subject: Subject
}

interface PlacementTestProps {
  onComplete: (subjectScores: { math: number; bahasa: number; english: number }) => void
  onCancel: () => void
}

// Combined placement test with 4 questions from each subject (12 total)
const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // Math Questions (4)
  {
    id: "math_1",
    question: "What is 15 + 27?",
    options: ["42", "41", "43", "40"],
    correctAnswer: 0,
    difficulty: "easy",
    subject: "math"
  },
  {
    id: "math_2", 
    question: "Solve for x: 2x + 5 = 13",
    options: ["4", "3", "5", "6"],
    correctAnswer: 0,
    difficulty: "medium",
    subject: "math"
  },
  {
    id: "math_3",
    question: "What is the derivative of x²?",
    options: ["2x", "x", "2", "x²"],
    correctAnswer: 0,
    difficulty: "hard",
    subject: "math"
  },
  {
    id: "math_4",
    question: "What is 25% of 80?",
    options: ["20", "15", "25", "30"],
    correctAnswer: 0,
    difficulty: "medium",
    subject: "math"
  },
  // Bahasa Questions (4)
  {
    id: "bahasa_1",
    question: "Kata 'berlari' termasuk kata...",
    options: ["Kerja", "Benda", "Sifat", "Keterangan"],
    correctAnswer: 0,
    difficulty: "easy",
    subject: "bahasa"
  },
  {
    id: "bahasa_2",
    question: "Sinonim dari kata 'cantik' adalah...",
    options: ["Elok", "Jelek", "Biasa", "Aneh"],
    correctAnswer: 0,
    difficulty: "easy",
    subject: "bahasa"
  },
  {
    id: "bahasa_3",
    question: "Kalimat yang menggunakan subjek dan predikat yang tepat adalah...",
    options: [
      "Adik bermain di taman",
      "Bermain adik taman di", 
      "Di taman bermain adik",
      "Taman bermain di adik"
    ],
    correctAnswer: 0,
    difficulty: "medium",
    subject: "bahasa"
  },
  {
    id: "bahasa_4",
    question: "Antonim dari 'gelap' adalah...",
    options: ["Terang", "Hitam", "Suram", "Kelam"],
    correctAnswer: 0,
    difficulty: "easy",
    subject: "bahasa"
  },
  // English Questions (4)
  {
    id: "english_1",
    question: "Choose the correct verb: 'She _____ to school every day.'",
    options: ["goes", "go", "going", "gone"],
    correctAnswer: 0,
    difficulty: "easy",
    subject: "english"
  },
  {
    id: "english_2",
    question: "What is the past tense of 'run'?",
    options: ["ran", "runned", "runs", "running"],
    correctAnswer: 0,
    difficulty: "easy",
    subject: "english"
  },
  {
    id: "english_3",
    question: "Choose the correct sentence:",
    options: [
      "I have been studying English for three years.",
      "I have been study English for three years.",
      "I has been studying English for three years.",
      "I have been studied English for three years."
    ],
    correctAnswer: 0,
    difficulty: "medium",
    subject: "english"
  },
  {
    id: "english_4",
    question: "Which word is a synonym for 'beautiful'?",
    options: ["Lovely", "Ugly", "Plain", "Simple"],
    correctAnswer: 0,
    difficulty: "easy",
    subject: "english"
  }
]

const SUBJECT_INFO = {
  math: {
    name: "Mathematics",
    icon: Calculator,
    color: "green",
    description: "Numbers, equations, and problem solving"
  },
  bahasa: {
    name: "Bahasa Indonesia", 
    icon: BookOpen,
    color: "blue",
    description: "Indonesian language and grammar"
  },
  english: {
    name: "English",
    icon: Globe,
    color: "purple",
    description: "English language and grammar"
  }
}

interface PlacementTestProps {
  onComplete: (subjectScores: { math: number; bahasa: number; english: number }) => void
  onCancel: () => void
}

export default function PlacementTest({ onComplete, onCancel }: PlacementTestProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(60) // 60 seconds per question
  const [isCompleted, setIsCompleted] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const questions = PLACEMENT_QUESTIONS

  // Timer logic
  useEffect(() => {
    if (hasStarted && !isCompleted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && hasStarted) {
      handleNextQuestion()
    }
  }, [timeLeft, hasStarted, isCompleted])

  const handleStartTest = () => {
    setHasStarted(true)
    setTimeLeft(60)
  }

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
  }

  const handleNextQuestion = () => {
    const answer = selectedAnswer !== null ? selectedAnswer : -1
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)
    setSelectedAnswer(null)
    setTimeLeft(60)

    if (currentQuestion + 1 >= questions.length) {
      // Test completed
      setIsCompleted(true)
      const subjectScores = calculateSubjectScores(newAnswers)
      setTimeout(() => onComplete(subjectScores), 1500)
    } else {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const calculateSubjectScores = (userAnswers: number[]): { math: number; bahasa: number; english: number } => {
    const scores = { math: 0, bahasa: 0, english: 0 }
    
    questions.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        scores[question.subject] += 100 // 100 points per correct answer
      }
    })
    
    return scores
  }

  if (!hasStarted) {
    // Test Introduction Screen
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl relative z-50"
        >
          <div className="bg-slate-800/95 border-2 border-cyan-400 p-8 backdrop-blur-sm relative z-50">
            <div className="text-center mb-8">
              <h1 className="font-pixel text-3xl text-cyan-400 mb-4 tracking-wider">
                PLACEMENT TEST
              </h1>
              <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-transparent mb-4"></div>
              <p className="font-terminal text-cyan-300 text-lg mb-4">
                Complete 12 questions to determine your starting ELO for each subject
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-400/10 border border-green-400 p-4">
                  <Calculator className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <h3 className="font-pixel text-green-400 text-sm">MATHEMATICS</h3>
                  <p className="font-terminal text-xs text-green-300">4 Questions</p>
                </div>
                <div className="bg-blue-400/10 border border-blue-400 p-4">
                  <BookOpen className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <h3 className="font-pixel text-blue-400 text-sm">BAHASA INDONESIA</h3>
                  <p className="font-terminal text-xs text-blue-300">4 Questions</p>
                </div>
                <div className="bg-purple-400/10 border border-purple-400 p-4">
                  <Globe className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <h3 className="font-pixel text-purple-400 text-sm">ENGLISH</h3>
                  <p className="font-terminal text-xs text-purple-300">4 Questions</p>
                </div>
              </div>
              <div className="bg-yellow-400/10 border border-yellow-400 p-4 mb-6">
                <p className="font-terminal text-yellow-300 text-sm">
                  ⏱️ 60 seconds per question | 🎯 100 points per correct answer
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartTest}
                className="bg-cyan-600/80 border-2 border-cyan-400 text-cyan-300 font-pixel px-8 py-3 hover:bg-cyan-600 transition-colors relative z-50 pointer-events-auto"
              >
                START TEST
              </motion.button>
              <button
                onClick={onCancel}
                className="bg-red-600/80 border-2 border-red-400 text-red-300 font-pixel px-6 py-3 hover:bg-red-600 transition-colors relative z-50 pointer-events-auto"
              >
                SKIP FOR NOW
              </button>
            </div>
            <p className="font-terminal text-xs text-slate-400 mt-4 text-center">
              You can take the placement test later in your profile
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800/95 border-2 border-green-400 p-8 text-center max-w-md backdrop-blur-sm relative z-50"
        >
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="font-pixel text-2xl text-green-400 mb-4">TEST COMPLETED!</h2>
          <p className="font-terminal text-green-300">
            Calculating your ELO for each subject...
          </p>
        </motion.div>
      </div>
    )
  }

  // Test Questions Screen
  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const subjectColors = {
    math: 'text-green-400',
    bahasa: 'text-blue-400', 
    english: 'text-purple-400'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-50">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        key={currentQuestion}
        className="w-full max-w-3xl relative z-50"
      >
        <div className="bg-slate-800/95 border-2 border-cyan-400 p-8 backdrop-blur-sm relative z-50">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className={`font-pixel text-xl ${subjectColors[question.subject]}`}>
                {SUBJECT_INFO[question.subject].name.toUpperCase()}
              </h2>
              <p className="font-terminal text-cyan-300">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className={`font-pixel text-lg ${timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-700 mb-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-cyan-400"
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Question */}
          <div className="mb-8">
            <h3 className="font-pixel text-lg text-cyan-400 mb-6">
              {question.question}
            </h3>
            
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 text-left border-2 transition-all font-terminal relative z-50 pointer-events-auto ${
                    selectedAnswer === index
                      ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                      : 'border-slate-600 hover:border-slate-500 bg-slate-900/50 text-slate-300'
                  }`}
                >
                  <span className="font-pixel text-sm mr-4">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-pixel border ${
                question.difficulty === 'easy' ? 'border-green-400 text-green-400' :
                question.difficulty === 'medium' ? 'border-yellow-400 text-yellow-400' :
                'border-red-400 text-red-400'
              }`}>
                {question.difficulty.toUpperCase()}
              </span>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextQuestion}
              disabled={selectedAnswer === null}
              className={`font-pixel px-6 py-3 transition-all relative z-50 pointer-events-auto ${
                selectedAnswer !== null
                  ? 'retro-button text-slate-900'
                  : 'bg-slate-600 border-2 border-slate-500 text-slate-400 cursor-not-allowed'
              }`}
            >
              {currentQuestion + 1 === questions.length ? 'FINISH' : 'NEXT'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
