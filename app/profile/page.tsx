"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { signOutUser, updateUserProfile, updateUserEmail, updateUserPassword } from "@/lib/firebase/auth"
import { getUserRank } from "@/lib/firebase/firestore"
import { 
  User, 
  Mail, 
  Calendar, 
  Trophy, 
  Target, 
  BookOpen, 
  Calculator, 
  Globe, 
  LogOut,
  Edit,
  Award,
  TrendingUp,
  Clock,
  Star,
  Zap,
  Shield,
  Crown,
  X
} from "lucide-react"
import Link from "next/link"
import type { SubjectElo } from "@/lib/firebase/auth"
import { DebugOverlay } from "@/components/ui/debug-overlay"

export default function ProfilePage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [userRanks, setUserRanks] = useState<Record<keyof SubjectElo | 'overall', number>>({
    overall: 0,
    math: 0,
    bahasa: 0,
    english: 0
  })
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const router = useRouter()

  // Helper function to get overall ELO
  const getOverallElo = () => {
    if (!userProfile) return 0
    return Math.round((userProfile.elo.math + userProfile.elo.bahasa + userProfile.elo.english) / 3)
  }

  // Helper function to get ELO color
  const getEloColor = (elo: number) => {
    if (elo >= 1200) return "text-yellow-400"
    if (elo >= 800) return "text-cyan-400"
    if (elo >= 600) return "text-green-400"
    return "text-pink-400"
  }

  // Helper function to get rank title
  const getRankTitle = (elo: number) => {
    if (elo >= 1200) return "GRANDMASTER"
    if (elo >= 800) return "MASTER"
    if (elo >= 600) return "EXPERT"
    return "ROOKIE"
  }

  // Helper function to format date
  const formatDate = (date: any) => {
    try {
      if (!date) return 'Unknown'
      if (date.toDate) return date.toDate().toLocaleDateString()
      if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString()
      if (date instanceof Date) return date.toLocaleDateString()
      return new Date(date).toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }

  // Helper function to get achievement badges
  const getAchievements = () => {
    if (!userProfile) return []
    
    const achievements = []
    const overallElo = getOverallElo()
    
    // ELO-based achievements
    if (overallElo >= 1200) achievements.push({ icon: Crown, name: "GRANDMASTER", color: "text-yellow-400", desc: "Reached 1200+ ELO" })
    else if (overallElo >= 800) achievements.push({ icon: Shield, name: "MASTER", color: "text-cyan-400", desc: "Reached 800+ ELO" })
    else if (overallElo >= 600) achievements.push({ icon: Star, name: "EXPERT", color: "text-green-400", desc: "Reached 600+ ELO" })
    
    // Placement test achievement
    if (userProfile.placementTestCompleted) {
      achievements.push({ icon: Award, name: "TESTED", color: "text-purple-400", desc: "Completed placement test" })
    }
    
    // Multi-subject achievements
    const subjectCount = Object.values(userProfile.elo).filter(elo => elo >= 600).length
    if (subjectCount >= 3) {
      achievements.push({ icon: Zap, name: "POLYMATH", color: "text-orange-400", desc: "Expert in all subjects" })
    } else if (subjectCount >= 2) {
      achievements.push({ icon: Target, name: "VERSATILE", color: "text-blue-400", desc: "Expert in multiple subjects" })
    }
    
    return achievements
  }
  const subjectInfo = {
    math: { name: "Mathematics", icon: Calculator, color: "green" },
    bahasa: { name: "Bahasa Indonesia", icon: BookOpen, color: "blue" },
    english: { name: "English", icon: Globe, color: "purple" }
  }

  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) return

    // Only redirect if we're sure there's no user and auth has finished loading
    if (!user && !authLoading) {
      console.log("No user found, redirecting to login...")
      router.push("/login")
      return
    }

    const fetchUserRanks = async () => {
      if (!userProfile) return

      try {
        const [overallRank, mathRank, bahasaRank, englishRank] = await Promise.all([
          getUserRank(userProfile.id),
          getUserRank(userProfile.id, 'math'),
          getUserRank(userProfile.id, 'bahasa'),
          getUserRank(userProfile.id, 'english')
        ])

        setUserRanks({
          overall: overallRank,
          math: mathRank,
          bahasa: bahasaRank,
          english: englishRank
        })
      } catch (error) {
        console.error("Error fetching user ranks:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRanks()
  }, [user, userProfile, authLoading, router])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await signOutUser()
      
      // Clear any session cookies
      document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      
      // Clear local storage if needed
      localStorage.removeItem('userSession')
      
      // The auth context will automatically detect the sign out and redirect
      // But we'll add a small delay and manual redirect as fallback
      setTimeout(() => {
        router.push("/login")
      }, 1000)
      
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoggingOut(false)
      // Still try to redirect even if there's an error
      router.push("/login")
    }
  }

  const handleEditProfile = () => {
    setEditForm({
      username: userProfile?.username || '',
      email: userProfile?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setEditError('')
    setEditSuccess('')
    setShowEditModal(true)
  }

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return

    setEditLoading(true)
    setEditError('')
    setEditSuccess('')

    try {
      // Validate form
      if (editForm.newPassword && editForm.newPassword !== editForm.confirmPassword) {
        throw new Error("New passwords don't match")
      }

      if (editForm.newPassword && editForm.newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters")
      }

      if (editForm.newPassword && !editForm.currentPassword) {
        throw new Error("Current password is required to change password")
      }

      // Update username if changed
      if (editForm.username !== userProfile.username) {
        await updateUserProfile(user.uid, { username: editForm.username })
      }

      // Email changes are temporarily disabled
      // Skip email update to avoid Firebase verification error

      // Update password if provided
      if (editForm.newPassword) {
        await updateUserPassword(editForm.currentPassword, editForm.newPassword)
      }

      setEditSuccess('Profile updated successfully!')
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowEditModal(false)
        window.location.reload() // Refresh to show updated data
      }, 2000)

    } catch (error: any) {
      console.error("Profile update error:", error)
      setEditError(error.message || 'Failed to update profile')
    } finally {
      setEditLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full"
        />
        <span className="ml-4 font-pixel text-cyan-400 text-lg">LOADING PROFILE...</span>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null
  }

  return (
    <div className="min-h-screen p-4">
      {/* <DebugOverlay enabled={process.env.NODE_ENV === 'development'} /> */}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-black font-pixel text-2xl flex-shrink-0">
                {userProfile.username[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-pixel text-2xl text-cyan-400 mb-1 truncate">
                  {userProfile.username.toUpperCase()}
                </h1>
                <div className="flex items-center gap-2 text-cyan-300 font-terminal text-sm truncate">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{userProfile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-cyan-300 font-terminal text-sm mt-1">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  Joined {formatDate(userProfile.createdAt)}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 relative z-50 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEditProfile}
                className="bg-purple-600/80 border-2 border-purple-400 text-purple-300 font-pixel px-3 py-1 text-xs hover:bg-purple-600 transition-colors relative z-50"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
              >
                <Edit className="w-3 h-3 inline mr-1" />
                EDIT PROFILE
              </motion.button>
              <Link href="/dashboard" className="relative z-50">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="retro-button font-pixel text-slate-900 px-3 py-1 text-xs relative z-50 w-full sm:w-auto"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
                >
                  ← DASHBOARD
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Overall Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-cyan-400" />
            <h2 className="font-pixel text-xl text-cyan-400">OVERALL STATS</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900/50 border border-slate-600 p-4 text-center">
              <div className={`font-pixel text-2xl ${getEloColor(getOverallElo())}`}>
                {getOverallElo()}
              </div>
              <div className="font-terminal text-xs text-cyan-300 mt-1">OVERALL ELO</div>
              <div className="font-terminal text-xs text-slate-400">
                {getRankTitle(getOverallElo())}
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-600 p-4 text-center">
              <div className="font-pixel text-2xl text-cyan-400">#{userRanks.overall}</div>
              <div className="font-terminal text-xs text-cyan-300 mt-1">OVERALL RANK</div>
              <div className="font-terminal text-xs text-slate-400">GLOBAL</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-600 p-4 text-center">
              <div className="font-pixel text-lg text-slate-300">
                {userProfile.preferredSubject?.toUpperCase() || 'NONE'}
              </div>
              <div className="font-terminal text-xs text-cyan-300 mt-1">PREFERRED</div>
              <div className="font-terminal text-xs text-slate-400">SUBJECT</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-600 p-4 text-center">
              <div className="font-pixel text-2xl text-yellow-400">
                {userProfile.placementTestCompleted ? '✅' : '❌'}
              </div>
              <div className="font-terminal text-xs text-cyan-300 mt-1">PLACEMENT</div>
              <div className="font-terminal text-xs text-slate-400">TEST</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-600 p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full ${i < (userProfile.lives || 0) ? 'bg-red-400' : 'bg-slate-600'}`}
                  />
                ))}
              </div>
              <div className="font-pixel text-lg text-red-400">{userProfile.lives || 0}/3</div>
              <div className="font-terminal text-xs text-cyan-300 mt-1">LIVES</div>
              <div className="font-terminal text-xs text-slate-400">TRAINING</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-600 p-4 text-center">
              <div className="font-pixel text-2xl text-orange-400">
                {Math.max(...Object.values(userProfile.elo))}
              </div>
              <div className="font-terminal text-xs text-cyan-300 mt-1">BEST ELO</div>
              <div className="font-terminal text-xs text-slate-400">
                {Object.entries(userProfile.elo)
                  .find(([_, elo]) => elo === Math.max(...Object.values(userProfile.elo)))?.[0]
                  ?.toUpperCase() || 'N/A'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Subject Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-cyan-400" />
            <h2 className="font-pixel text-xl text-cyan-400">SUBJECT PERFORMANCE</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(subjectInfo) as Array<keyof SubjectElo>).map((subject) => {
              const info = subjectInfo[subject]
              const Icon = info.icon
              const elo = userProfile.elo[subject]
              const rank = userRanks[subject]
              
              return (
                <motion.div
                  key={subject}
                  whileHover={{ scale: 1.02 }}
                  className={`bg-slate-900/50 border-2 p-4 transition-all ${
                    subject === 'math' ? 'border-green-400' :
                    subject === 'bahasa' ? 'border-blue-400' :
                    'border-purple-400'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className={`w-8 h-8 ${
                      subject === 'math' ? 'text-green-400' :
                      subject === 'bahasa' ? 'text-blue-400' :
                      'text-purple-400'
                    }`} />
                    <div>
                      <h3 className={`font-pixel text-lg ${
                        subject === 'math' ? 'text-green-400' :
                        subject === 'bahasa' ? 'text-blue-400' :
                        'text-purple-400'
                      }`}>
                        {info.name.split(' ')[0].toUpperCase()}
                      </h3>
                      <p className="font-terminal text-xs text-slate-400">
                        {info.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-terminal text-sm text-cyan-300">ELO:</span>
                      <span className={`font-pixel text-lg ${getEloColor(elo)}`}>
                        {elo}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-terminal text-sm text-cyan-300">Rank:</span>
                      <span className="font-pixel text-lg text-cyan-400">
                        #{rank}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-terminal text-sm text-cyan-300">Title:</span>
                      <span className="font-terminal text-sm text-slate-300">
                        {getRankTitle(elo)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full h-2 bg-slate-700 rounded">
                      <div 
                        className={`h-full rounded transition-all duration-500 ${
                          subject === 'math' ? 'bg-green-400' :
                          subject === 'bahasa' ? 'bg-blue-400' :
                          'bg-purple-400'
                        }`}
                        style={{ width: `${Math.min((elo / 1200) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-terminal text-xs text-slate-500">0</span>
                      <span className="font-terminal text-xs text-slate-500">1200+</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-cyan-400" />
            <h2 className="font-pixel text-xl text-cyan-400">ACHIEVEMENTS</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {getAchievements().map((achievement, index) => {
              const Icon = achievement.icon
              return (
                <motion.div
                  key={achievement.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="bg-slate-900/50 border border-slate-600 p-3 text-center hover:border-cyan-400 transition-colors group"
                >
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${achievement.color} group-hover:scale-110 transition-transform`} />
                  <div className={`font-pixel text-xs ${achievement.color} mb-1`}>
                    {achievement.name}
                  </div>
                  <div className="font-terminal text-xs text-slate-400">
                    {achievement.desc}
                  </div>
                </motion.div>
              )
            })}
            {getAchievements().length === 0 && (
              <div className="col-span-full text-center py-8">
                <Star className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="font-pixel text-slate-500 text-sm">NO ACHIEVEMENTS YET</p>
                <p className="font-terminal text-slate-600 text-xs mt-1">Complete placement test and play games to earn badges!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tips for improvement */}
        {getOverallElo() < 800 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-2 border-blue-400 p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              <h2 className="font-pixel text-xl text-blue-400">IMPROVEMENT TIPS</h2>
            </div>
            <div className="space-y-3">
              {!userProfile.placementTestCompleted && (
                <div className="flex items-start gap-3 p-3 bg-yellow-900/30 border border-yellow-600 rounded">
                  <Award className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-pixel text-sm text-yellow-400 mb-1">TAKE PLACEMENT TEST</p>
                    <p className="font-terminal text-xs text-yellow-200">Get accurate ELO ratings for all subjects and unlock competitive play!</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 bg-green-900/30 border border-green-600 rounded">
                <Trophy className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-pixel text-sm text-green-400 mb-1">PLAY MORE GAMES</p>
                  <p className="font-terminal text-xs text-green-200">Regular practice in your preferred subject will improve your ELO rating!</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-purple-900/30 border border-purple-600 rounded">
                <Target className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-pixel text-sm text-purple-400 mb-1">TRY ALL SUBJECTS</p>
                  <p className="font-terminal text-xs text-purple-200">Becoming skilled in multiple subjects earns you special achievement badges!</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Edit className="w-6 h-6 text-cyan-400" />
            <h2 className="font-pixel text-xl text-cyan-400">ACTIONS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-50">
            {!userProfile.placementTestCompleted && (
              <Link href="/placement-test" className="relative z-50">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-yellow-600/80 border-2 border-yellow-400 text-yellow-300 font-pixel px-6 py-3 hover:bg-yellow-600 transition-colors relative z-50"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
                >
                  <Award className="w-5 h-5 inline mr-2" />
                  TAKE PLACEMENT TEST
                </motion.button>
              </Link>
            )}
            <Link href="/leaderboard" className="relative z-50">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-cyan-600/80 border-2 border-cyan-400 text-cyan-300 font-pixel px-6 py-3 hover:bg-cyan-600 transition-colors relative z-50"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
              >
                <TrendingUp className="w-5 h-5 inline mr-2" />
                VIEW LEADERBOARD
              </motion.button>
            </Link>
            <Link href="/play" className="relative z-50">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-green-600/80 border-2 border-green-400 text-green-300 font-pixel px-6 py-3 hover:bg-green-600 transition-colors relative z-50"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
              >
                <Trophy className="w-5 h-5 inline mr-2" />
                PLAY GAME
              </motion.button>
            </Link>
            {userProfile.placementTestCompleted && (
              <Link href="/placement-test" className="relative z-50">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-purple-600/80 border-2 border-purple-400 text-purple-300 font-pixel px-6 py-3 hover:bg-purple-600 transition-colors relative z-50"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
                >
                  <Clock className="w-5 h-5 inline mr-2" />
                  RETAKE PLACEMENT TEST
                </motion.button>
              </Link>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full bg-red-600/80 border-2 border-red-400 text-red-300 font-pixel px-6 py-3 hover:bg-red-600 transition-colors disabled:opacity-50 relative z-50"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
            >
              <LogOut className="w-5 h-5 inline mr-2" />
              {isLoggingOut ? 'LOGGING OUT...' : 'LOGOUT'}
            </motion.button>
          </div>
        </motion.div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-800 border-2 border-cyan-400 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Edit className="w-6 h-6 text-cyan-400" />
                    <h2 className="font-pixel text-xl text-cyan-400">EDIT PROFILE</h2>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {editError && (
                  <div className="bg-red-900/50 border border-red-400 p-3 mb-4">
                    <p className="font-terminal text-red-300 text-sm">{editError}</p>
                  </div>
                )}

                {editSuccess && (
                  <div className="bg-green-900/50 border border-green-400 p-3 mb-4">
                    <p className="font-terminal text-green-300 text-sm">{editSuccess}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block font-pixel text-cyan-400 text-sm mb-2">USERNAME</label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                      className="w-full bg-slate-900 border-2 border-slate-600 text-cyan-300 font-terminal px-3 py-2 focus:border-cyan-400 focus:outline-none"
                      placeholder="Enter new username"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block font-pixel text-cyan-400 text-sm mb-2">
                      EMAIL

                    </label>
                    <input
                      type="email"
                      value={userProfile.email}
                      disabled
                      className="w-full bg-slate-800 border-2 border-slate-700 text-slate-400 font-terminal px-3 py-2 cursor-not-allowed"
                      placeholder="Email changes temporarily disabled"
                    />
                  </div>

                  {/* Current Password */}
                  <div>
                    <label className="block font-pixel text-cyan-400 text-sm mb-2">
                      CURRENT PASSWORD
                      <span className="text-yellow-400 text-xs ml-2">(Required for password changes)</span>
                    </label>
                    <input
                      type="password"
                      value={editForm.currentPassword}
                      onChange={(e) => setEditForm({...editForm, currentPassword: e.target.value})}
                      className="w-full bg-slate-900 border-2 border-slate-600 text-cyan-300 font-terminal px-3 py-2 focus:border-cyan-400 focus:outline-none"
                      placeholder="Enter current password"
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block font-pixel text-cyan-400 text-sm mb-2">
                      NEW PASSWORD
                    </label>
                    <input
                      type="password"
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})}
                      className="w-full bg-slate-900 border-2 border-slate-600 text-cyan-300 font-terminal px-3 py-2 focus:border-cyan-400 focus:outline-none"
                      placeholder="Enter new password (min 6 chars)"
                    />
                  </div>

                  {/* Confirm Password */}
                  {editForm.newPassword && (
                    <div>
                      <label className="block font-pixel text-cyan-400 text-sm mb-2">CONFIRM NEW PASSWORD</label>
                      <input
                        type="password"
                        value={editForm.confirmPassword}
                        onChange={(e) => setEditForm({...editForm, confirmPassword: e.target.value})}
                        className="w-full bg-slate-900 border-2 border-slate-600 text-cyan-300 font-terminal px-3 py-2 focus:border-cyan-400 focus:outline-none"
                        placeholder="Confirm new password"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveProfile}
                    disabled={editLoading}
                    className="flex-1 bg-green-600/80 border-2 border-green-400 text-green-300 font-pixel px-4 py-2 text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {editLoading ? 'SAVING...' : 'SAVE CHANGES'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEditModal(false)}
                    disabled={editLoading}
                    className="bg-slate-600/80 border-2 border-slate-400 text-slate-300 font-pixel px-4 py-2 text-sm hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    CANCEL
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
