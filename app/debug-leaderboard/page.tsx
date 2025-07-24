"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { 
  getTopUsers, 
  getUserById,
  getAllUsers 
} from "@/lib/firebase/firestore"
import { 
  Search, 
  Database, 
  User,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

export default function DebugLeaderboardPage() {
  const { userProfile } = useAuth()
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const runDiagnostics = async () => {
    setLoading(true)
    setError("")
    setDebugData(null)

    try {
      console.log("🔍 Starting leaderboard diagnostics...")
      
      // Test 1: Get all users
      const allUsers = await getAllUsers()
      console.log("📊 All users:", allUsers)
      
      // Test 2: Get top users (overall)
      const topUsersOverall = await getTopUsers(10)
      console.log("🏆 Top users (overall):", topUsersOverall)
      
      // Test 3: Get top users by subject
      const topUsersMath = await getTopUsers(10, 'math')
      const topUsersBahasa = await getTopUsers(10, 'bahasa')
      const topUsersEnglish = await getTopUsers(10, 'english')
      
      console.log("🔢 Top users (math):", topUsersMath)
      console.log("📚 Top users (bahasa):", topUsersBahasa)
      console.log("🌍 Top users (english):", topUsersEnglish)
      
      // Test 4: Check current user data
      let currentUserData = null
      if (userProfile) {
        currentUserData = await getUserById(userProfile.id)
        console.log("👤 Current user data:", currentUserData)
      }
      
      // Test 5: Check for data structure issues
      const structureIssues: string[] = []
      allUsers.forEach((user, index) => {
        if (!user.elo) {
          structureIssues.push(`User ${user.username} (${user.id}) missing ELO object`)
        } else {
          if (typeof user.elo.math !== 'number') {
            structureIssues.push(`User ${user.username} has invalid math ELO: ${user.elo.math}`)
          }
          if (typeof user.elo.bahasa !== 'number') {
            structureIssues.push(`User ${user.username} has invalid bahasa ELO: ${user.elo.bahasa}`)
          }
          if (typeof user.elo.english !== 'number') {
            structureIssues.push(`User ${user.username} has invalid english ELO: ${user.elo.english}`)
          }
        }
        
        if (!user.username) {
          structureIssues.push(`User ${user.id} missing username`)
        }
        
        if (typeof user.placementTestCompleted !== 'boolean') {
          structureIssues.push(`User ${user.username} has invalid placementTestCompleted: ${user.placementTestCompleted}`)
        }
      })
      
      setDebugData({
        totalUsers: allUsers.length,
        allUsers,
        topUsersOverall,
        topUsersMath,
        topUsersBahasa,
        topUsersEnglish,
        currentUserData,
        structureIssues,
        placementTestUsers: allUsers.filter(u => u.placementTestCompleted),
        nonPlacementTestUsers: allUsers.filter(u => !u.placementTestCompleted)
      })
      
    } catch (err: any) {
      console.error("❌ Diagnostics failed:", err)
      setError(`Diagnostics failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/80 border-2 border-red-400 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h1 className="font-pixel text-2xl text-red-400">LEADERBOARD DEBUG</h1>
          </div>
          <p className="font-terminal text-cyan-300">
            Diagnose why leaderboard breaks after placement test
          </p>
        </motion.div>

        {/* Run Diagnostics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6 mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-cyan-600/80 border-2 border-cyan-400 text-cyan-300 font-pixel px-6 py-3 hover:bg-cyan-600 transition-colors disabled:opacity-50"
          >
            <Search className="w-5 h-5 inline mr-2" />
            {loading ? 'RUNNING DIAGNOSTICS...' : 'RUN DIAGNOSTICS'}
          </motion.button>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-900/50 border-2 border-red-400 p-4 mb-6"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="font-pixel text-red-400">ERROR</span>
            </div>
            <p className="font-terminal text-red-300 mt-2">{error}</p>
          </motion.div>
        )}

        {/* Results */}
        {debugData && (
          <div className="space-y-6">
            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/80 border-2 border-green-400 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h3 className="font-pixel text-lg text-green-400">SUMMARY</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-600 p-3 text-center">
                  <div className="font-pixel text-xl text-cyan-400">{debugData.totalUsers}</div>
                  <div className="font-terminal text-xs text-cyan-300">TOTAL USERS</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-600 p-3 text-center">
                  <div className="font-pixel text-xl text-green-400">{debugData.placementTestUsers.length}</div>
                  <div className="font-terminal text-xs text-green-300">PLACEMENT DONE</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-600 p-3 text-center">
                  <div className="font-pixel text-xl text-yellow-400">{debugData.nonPlacementTestUsers.length}</div>
                  <div className="font-terminal text-xs text-yellow-300">NO PLACEMENT</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-600 p-3 text-center">
                  <div className="font-pixel text-xl text-red-400">{debugData.structureIssues.length}</div>
                  <div className="font-terminal text-xs text-red-300">ISSUES</div>
                </div>
              </div>
            </motion.div>

            {/* Structure Issues */}
            {debugData.structureIssues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/30 border-2 border-red-400 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="font-pixel text-lg text-red-400">DATA STRUCTURE ISSUES</h3>
                </div>
                <div className="space-y-2">
                  {debugData.structureIssues.map((issue: string, index: number) => (
                    <div key={index} className="font-terminal text-sm text-red-300">
                      • {issue}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Current User Data */}
            {debugData.currentUserData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/80 border-2 border-cyan-400 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-pixel text-lg text-cyan-400">YOUR DATA</h3>
                </div>
                <div className="bg-slate-900/50 border border-slate-600 p-4 font-mono text-xs overflow-auto">
                  <pre className="text-cyan-300">
                    {JSON.stringify(debugData.currentUserData, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}

            {/* Leaderboard Results */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/80 border-2 border-cyan-400 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-cyan-400" />
                <h3 className="font-pixel text-lg text-cyan-400">LEADERBOARD DATA</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-pixel text-sm text-green-400 mb-2">TOP USERS (OVERALL)</h4>
                  <div className="bg-slate-900/50 border border-slate-600 p-3 max-h-48 overflow-auto">
                    {debugData.topUsersOverall.map((user: any, index: number) => (
                      <div key={user.id} className="font-terminal text-xs text-cyan-300 mb-1">
                        #{index + 1} {user.username} - {Math.round((user.elo.math + user.elo.bahasa + user.elo.english) / 3)} ELO
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-pixel text-sm text-blue-400 mb-2">MATH LEADERBOARD</h4>
                  <div className="bg-slate-900/50 border border-slate-600 p-3 max-h-48 overflow-auto">
                    {debugData.topUsersMath.map((user: any, index: number) => (
                      <div key={user.id} className="font-terminal text-xs text-cyan-300 mb-1">
                        #{index + 1} {user.username} - {user.elo.math} ELO
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Raw Data */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/80 border-2 border-slate-600 p-6"
            >
              <h3 className="font-pixel text-lg text-slate-400 mb-4">RAW DATA (FIRST 3 USERS)</h3>
              <div className="bg-slate-900/50 border border-slate-600 p-4 font-mono text-xs overflow-auto max-h-96">
                <pre className="text-slate-300">
                  {JSON.stringify(debugData.allUsers.slice(0, 3), null, 2)}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
