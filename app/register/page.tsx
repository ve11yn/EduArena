"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from("users").insert([
          {
            id: authData.user.id,
            username,
            elo: 400,
          },
        ])

        if (profileError) {
          setError("Failed to create user profile")
          return
        }

        router.push("/dashboard")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-800/90 backdrop-blur-sm border-2 border-pink-400 p-8 relative overflow-hidden">
          {/* Pixel corners */}
          <div className="absolute top-0 left-0 w-4 h-4 bg-pink-400"></div>
          <div className="absolute top-0 right-0 w-4 h-4 bg-pink-400"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 bg-pink-400"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-pink-400"></div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <Link
              href="/"
              className="inline-flex items-center text-pink-400 hover:text-pink-300 mb-6 font-terminal text-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />◀ BACK TO MENU
            </Link>
            <h1 className="font-pixel text-2xl text-pink-400 mb-4 tracking-wider">NEW PLAYER</h1>
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-pink-400 to-transparent mb-4"></div>
            <p className="font-terminal text-cyan-300 text-lg">Join the arena</p>
          </motion.div>

          <form onSubmit={handleRegister} className="space-y-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <label className="block font-pixel text-xs text-pink-400 mb-3 tracking-wider">PLAYER NAME</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400 w-5 h-5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border-2 border-pink-400/50 text-cyan-300 font-terminal text-lg placeholder-pink-400/50 focus:outline-none focus:border-pink-400 focus:bg-slate-900 transition-all"
                  placeholder="WARRIOR123"
                  required
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <label className="block font-pixel text-xs text-pink-400 mb-3 tracking-wider">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border-2 border-pink-400/50 text-cyan-300 font-terminal text-lg placeholder-pink-400/50 focus:outline-none focus:border-pink-400 focus:bg-slate-900 transition-all"
                  placeholder="player@arena.com"
                  required
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <label className="block font-pixel text-xs text-pink-400 mb-3 tracking-wider">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-900/80 border-2 border-pink-400/50 text-cyan-300 font-terminal text-lg placeholder-pink-400/50 focus:outline-none focus:border-pink-400 focus:bg-slate-900 transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pink-400 hover:text-pink-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/20 border-2 border-red-400 p-3 text-red-300 font-terminal text-sm"
              >
                ERROR: {error}
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 border-2 border-pink-400 text-white font-pixel text-sm tracking-wider hover:from-pink-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ textShadow: "0 0 10px rgba(255, 0, 255, 0.8)" }}
            >
              {loading ? "CREATING..." : "▶ JOIN ARENA"}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 text-center"
          >
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-pink-400/50 to-transparent mb-4"></div>
            <p className="font-terminal text-cyan-300 text-lg">
              Already registered?{" "}
              <Link
                href="/login"
                className="text-cyan-400 hover:text-cyan-300 font-pixel text-xs tracking-wider transition-colors"
              >
                LOGIN HERE
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
