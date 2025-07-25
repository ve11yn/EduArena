"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { Bot, Sparkles, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface GeneratedQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

export default function DebugAIQuiz() {
  const [subject, setSubject] = useState('math')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [count, setCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [error, setError] = useState('')
  const [metadata, setMetadata] = useState<any>(null)
  const { user } = useAuth()

  const subjects = [
    { id: 'math', name: 'Mathematics', icon: '🔢' },
    { id: 'bahasa', name: 'Bahasa Indonesia', icon: '📚' },
    { id: 'english', name: 'English', icon: '🗣️' }
  ]

  const difficulties = [
    { id: 'beginner', name: 'Beginner', color: 'green' },
    { id: 'intermediate', name: 'Intermediate', color: 'yellow' },
    { id: 'advanced', name: 'Advanced', color: 'red' }
  ]

  const generateQuestions = async () => {
    if (!user) return

    setLoading(true)
    setError('')
    setQuestions([])
    setMetadata(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject,
          difficulty,
          count
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate questions')
      }

      if (data.success) {
        setQuestions(data.data)
        setMetadata(data.metadata)
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Error generating questions:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate questions')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-pixel text-2xl text-red-400 mb-4">ACCESS DENIED</h1>
          <p className="font-terminal text-slate-400">Please log in to use the AI Quiz Tester</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="w-8 h-8 text-purple-400" />
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </div>
          <h1 className="font-pixel text-3xl text-cyan-400 mb-2">GEMINI AI QUIZ TESTER</h1>
          <p className="font-terminal text-slate-400">Test Google Gemini-powered question generation (FREE)</p>
        </motion.div>

        {/* Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 border-2 border-cyan-400/50 p-6 mb-6"
        >
          <h2 className="font-pixel text-lg text-cyan-400 mb-4">GENERATION SETTINGS</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Subject Selection */}
            <div>
              <label className="font-pixel text-sm text-slate-300 block mb-2">SUBJECT</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-700 border border-cyan-400/50 px-3 py-2 font-terminal text-white"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Selection */}
            <div>
              <label className="font-pixel text-sm text-slate-300 block mb-2">DIFFICULTY</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-slate-700 border border-cyan-400/50 px-3 py-2 font-terminal text-white"
              >
                {difficulties.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Count Selection */}
            <div>
              <label className="font-pixel text-sm text-slate-300 block mb-2">COUNT</label>
              <input 
                type="number" 
                min="1" 
                max="10"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-700 border border-cyan-400/50 px-3 py-2 font-terminal text-white"
              />
            </div>
          </div>

          <button
            onClick={generateQuestions}
            disabled={loading}
            className="w-full retro-button font-pixel text-slate-900 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                GENERATING...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                GENERATE QUESTIONS
              </>
            )}
          </button>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-900/50 border-2 border-red-400 p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-pixel text-red-400 mb-1">ERROR</h3>
              <p className="font-terminal text-red-300 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Metadata Display */}
        {metadata && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-900/30 border-2 border-green-400/50 p-4 mb-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="font-pixel text-green-400">GENERATION SUCCESS</h3>
            </div>
            <div className="font-terminal text-sm text-green-300">
              <p>Subject: {metadata.subject} | Difficulty: {metadata.difficulty} | Count: {metadata.count}</p>
              <p>Generated: {new Date(metadata.generatedAt).toLocaleString()}</p>
              <p>Method: {metadata.generatedWith}</p>
            </div>
          </motion.div>
        )}

        {/* Questions Display */}
        {questions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="font-pixel text-xl text-cyan-400">GENERATED QUESTIONS</h2>
            
            {questions.map((question, index) => (
              <div key={index} className="bg-slate-800 border-2 border-cyan-400/50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-pixel text-lg text-cyan-400">Q{index + 1}</span>
                </div>
                
                <h3 className="font-terminal text-white text-lg mb-4">{question.question}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {question.options.map((option, optIndex) => (
                    <div 
                      key={optIndex}
                      className={`p-3 border-2 font-terminal ${
                        optIndex === question.correct_answer 
                          ? 'border-green-400 bg-green-400/20 text-green-300' 
                          : 'border-slate-600 bg-slate-700 text-slate-300'
                      }`}
                    >
                      {String.fromCharCode(65 + optIndex)}. {option}
                      {optIndex === question.correct_answer && (
                        <span className="ml-2 text-green-400 font-pixel text-xs">✓ CORRECT</span>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-900/30 border border-blue-400/50 p-3">
                  <h4 className="font-pixel text-blue-400 text-sm mb-1">EXPLANATION:</h4>
                  <p className="font-terminal text-blue-300 text-sm">{question.explanation}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
