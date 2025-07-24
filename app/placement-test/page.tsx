"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { updateUserEloAfterPlacementTest } from "@/lib/firebase/auth"
import PlacementTest from "@/components/placement-test"

export default function PlacementTestPage() {
  const { user, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleTestComplete = async (subjectScores: { math: number; bahasa: number; english: number }) => {
    if (!user) return
    
    try {
      setLoading(true)
      await updateUserEloAfterPlacementTest(user.uid, subjectScores)
      router.push("/dashboard")
    } catch (error) {
      console.error("Error updating placement test results:", error)
      // Still redirect to dashboard even if update fails
      router.push("/dashboard")
    }
  }

  const handleSkip = () => {
    router.push("/dashboard")
  }

  if (!user) {
    router.push("/login")
    return null
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
