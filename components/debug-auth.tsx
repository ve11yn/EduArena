"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { auth } from "@/lib/firebase/config"
import { onAuthStateChanged } from "firebase/auth"

export default function DebugAuth() {
  const { user, userProfile } = useAuth()
  const [authState, setAuthState] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState(user)
      console.log("Auth state changed:", user)
    })

    return () => unsubscribe()
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed bottom-4 right-4 bg-slate-800 border border-cyan-400 p-4 max-w-md text-xs font-mono z-50"
    >
      <h3 className="text-cyan-400 font-bold mb-2">🐛 AUTH DEBUG</h3>
      <div className="space-y-1 text-cyan-300">
        <p><strong>Context User:</strong> {user ? '✅ Logged in' : '❌ Not logged in'}</p>
        <p><strong>Auth State:</strong> {authState ? '✅ Authenticated' : '❌ Not authenticated'}</p>
        <p><strong>User Profile:</strong> {userProfile ? '✅ Loaded' : '❌ Not loaded'}</p>
        {user && (
          <>
            <p><strong>UID:</strong> {user.uid}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </>
        )}
        {userProfile && (
          <>
            <p><strong>Username:</strong> {userProfile.username}</p>
            <p><strong>ELO:</strong> {userProfile.elo}</p>
          </>
        )}
      </div>
    </motion.div>
  )
}
