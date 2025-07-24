"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInUser } from "@/lib/firebase/auth"
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await signInUser(email, password)

      // Set session cookie for middleware
      document.cookie = "__session=authenticated; path=/; max-age=86400"

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
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
        <div className="bg-slate-800/90 backdrop-blur-sm border-2 border-cyan-400 p-8 relative overflow-hidden">
          {/* Pixel corners */}
          <div className="absolute top-0 left-0 w-4 h-4 bg-cyan-400"></div>
          <div className="absolute top-0 right-0 w-4 h-4 bg-cyan-400"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 bg-cyan-400"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-cyan-400"></div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <Link
              href="/"
              className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-6 font-terminal text-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />◀ BACK TO MENU
            </Link>
            <h1 className="font-pixel text-2xl text-cyan-400 mb-4 tracking-wider">PLAYER LOGIN</h1>
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-4"></div>
            <p className="font-terminal text-cyan-300 text-lg">Enter your credentials</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <label className="block font-pixel text-xs text-cyan-400 mb-3 tracking-wider">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border-2 border-cyan-400/50 text-cyan-300 font-terminal text-lg placeholder-cyan-400/50 focus:outline-none focus:border-cyan-400 focus:bg-slate-900 transition-all"
                  placeholder="player@arena.com"
                  required
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <label className="block font-pixel text-xs text-cyan-400 mb-3 tracking-wider">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-900/80 border-2 border-cyan-400/50 text-cyan-300 font-terminal text-lg placeholder-cyan-400/50 focus:outline-none focus:border-cyan-400 focus:bg-slate-900 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-colors"
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
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 retro-button font-pixel text-slate-900 text-sm tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "LOGGING IN..." : "▶ ENTER ARENA"}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent mb-4"></div>
            <p className="font-terminal text-cyan-300 text-lg">
              New player?{" "}
              <Link
                href="/register"
                className="text-pink-400 hover:text-pink-300 font-pixel text-xs tracking-wider transition-colors"
              >
                CREATE ACCOUNT
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
