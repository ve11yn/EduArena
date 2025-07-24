"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { updateUserEloAfterPlacementTest } from "@/lib/firebase/auth"
import PlacementTest from "@/components/placement-test"

export default function PlacementTestPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleTestComplete = async (subjectScores: { math: number; bahasa: number; english: number }) => {
    if (!user) return
    
    try {
      setLoading(true)
      console.log("🎯 Placement test completed with scores:", subjectScores)
      
      await updateUserEloAfterPlacementTest(user.uid, subjectScores)
      console.log("✅ Successfully updated user ELO after placement test")
      console.log("📋 Placement test completed flag should now be true")
      
      router.push("/dashboard")
    } catch (error) {
      console.error("❌ Error updating placement test results:", error)
      // Still redirect to dashboard even if update fails
      router.push("/dashboard")
    }
  }

  const handleSkip = () => {
    router.push("/dashboard")
  }

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <span className="font-pixel text-cyan-400 text-lg">LOADING...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  // Check if user has already completed placement test
  if (userProfile?.placementTestCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-slate-800/95 border-2 border-yellow-400 p-8 text-center">
            <div className="w-16 h-16 bg-yellow-400 text-black flex items-center justify-center mx-auto mb-4 font-pixel text-2xl">
              ✓
            </div>
            <h1 className="font-pixel text-2xl text-yellow-400 mb-4">
              PLACEMENT TEST COMPLETED
            </h1>
            <p className="font-terminal text-cyan-300 mb-6">
              You have already completed the placement test. Your ELO ratings have been set based on your performance.
            </p>
            <p className="font-terminal text-slate-400 text-sm mb-6">
              Note: Each user can only take the placement test once. Your current ratings are shown below.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-400/10 border border-green-400 p-4">
                <h3 className="font-pixel text-green-400 text-sm mb-1">MATH ELO</h3>
                <p className="font-terminal text-green-300 text-xl">{userProfile.elo.math}</p>
              </div>
              <div className="bg-blue-400/10 border border-blue-400 p-4">
                <h3 className="font-pixel text-blue-400 text-sm mb-1">BAHASA ELO</h3>
                <p className="font-terminal text-blue-300 text-xl">{userProfile.elo.bahasa}</p>
              </div>
              <div className="bg-purple-400/10 border border-purple-400 p-4">
                <h3 className="font-pixel text-purple-400 text-sm mb-1">ENGLISH ELO</h3>
                <p className="font-terminal text-purple-300 text-xl">{userProfile.elo.english}</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="retro-button font-pixel text-slate-900 px-6 py-3"
              >
                ← BACK TO DASHBOARD
              </button>
              <button
                onClick={() => router.push("/play")}
                className="bg-green-600/80 border-2 border-green-400 text-green-300 font-pixel px-6 py-3 hover:bg-green-600 transition-colors"
              >
                START PLAYING →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <span className="font-pixel text-cyan-400 text-lg">SAVING RESULTS...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-50">
      <PlacementTest 
        onComplete={handleTestComplete}
        onCancel={handleSkip}
      />
    </div>
  )
}
