"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Trophy, Users, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Floating pixel elements */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="absolute top-20 left-20 w-16 h-16"
      >
        <Image src="../images/pixel_star.png" alt="Pixel star" width={64} height={64} className="pixel-art" />
      </motion.div>

      <motion.div
        animate={{
          y: [0, 15, 0],
          rotate: [0, -5, 5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute top-32 right-20 w-16 h-16"
      >
        <Image src="../images/pixel_heart.png" alt="Pixel heart" width={64} height={64} className="pixel-art" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl mx-auto z-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="relative">
            <Image
              src="/images/pixel_trophy.png"
              alt="Pixel sword"
              width={120}
              height={80}
              className="pixel-art mx-auto mb-4"
            />
            {/* <div className="absolute inset-0 bg-cyan-400 blur-xl  rounded-full"></div> */}
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-pixel text-4xl md:text-6xl font-bold text-cyan-400 mb-6 tracking-wider"
          style={{ textShadow: "0 0 20px rgba(0, 255, 255, 0.8)" }}
        >
          EDUARENA
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-cyan-400 text-slate-900 font-pixel text-lg md:text-xl py-3 px-8 mb-8 inline-block"
          style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%)" }}
        >
          ARENA COMPETITION
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="font-terminal text-xl text-cyan-300 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          CHALLENGE OPPONENTS • CLIMB RANKINGS • PROVE YOUR SKILLS
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className="bg-slate-800/80 backdrop-blur-sm border-2 border-cyan-400 p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="font-pixel text-sm text-cyan-400 mb-2">ELO SYSTEM</h3>
            <p className="font-terminal text-cyan-300 text-sm">Chess-style rating with K=32 factor</p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm border-2 border-pink-400 p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Users className="w-12 h-12 text-pink-400 mx-auto mb-4" />
            <h3 className="font-pixel text-sm text-pink-400 mb-2">1V1 DUELS</h3>
            <p className="font-terminal text-cyan-300 text-sm">Face opponents in skill matches</p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm border-2 border-green-400 p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Zap className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="font-pixel text-sm text-green-400 mb-2">REAL-TIME</h3>
            <p className="font-terminal text-cyan-300 text-sm">Instant ELO updates</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-6 justify-center"
        >
          <Link href="/register">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="retro-button font-pixel text-slate-900 px-8 py-4 text-sm tracking-wider"
            >
              ▶ START GAME
            </motion.button>
          </Link>

          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="bg-slate-800/80 border-2 border-cyan-400 text-cyan-400 font-pixel px-8 py-4 text-sm tracking-wider hover:bg-cyan-400/10 transition-all"
            >
              ◀ CONTINUE
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Animated background elements */}
      <div className="absolute bottom-10 left-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-8 h-8 border-2 border-cyan-400"
          style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
        />
      </div>

      <div className="absolute bottom-20 right-10">
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-6 h-6 bg-pink-400"
        />
      </div>
    </div>
  )
}
