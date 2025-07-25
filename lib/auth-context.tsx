"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { onAuthStateChange, getUserProfile, type UserProfile } from "./firebase/auth"

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  refreshUserProfile: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUserProfile = async () => {
    if (user) {
      console.log('🔄 AuthContext: Refreshing user profile...')
      try {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)
        console.log('✅ AuthContext: User profile refreshed successfully, lives:', profile?.lives)
      } catch (error) {
        console.error('❌ AuthContext: Failed to refresh user profile:', error)
      }
    } else {
      console.log('⚠️ AuthContext: Cannot refresh profile - no user logged in')
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user)

      if (user) {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  return (<AuthContext.Provider value={{ user, userProfile, loading, refreshUserProfile }}> 
    {children} 
  </AuthContext.Provider> )
}
