"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Search, 
  User, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Trash2,
  Edit,
  Plus
} from "lucide-react"
import { collection, doc, getDoc, getDocs, deleteDoc, updateDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export default function TroubleshootingPage() {
  const [userId, setUserId] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const searchUser = async () => {
    if (!userId && !userEmail) {
      setError("Please enter either User ID or Email")
      return
    }

    setLoading(true)
    setError("")
    setResults(null)

    try {
      let userData = null
      
      if (userId) {
        // Search by ID
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          userData = { id: userDoc.id, ...userDoc.data() }
        }
      } else if (userEmail) {
        // Search by email
        const usersCollection = collection(db, "users")
        const snapshot = await getDocs(usersCollection)
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data.email === userEmail) {
            userData = { id: doc.id, ...data }
          }
        })
      }

      if (userData) {
        setResults({
          found: true,
          user: userData,
          issues: checkUserIssues(userData)
        })
      } else {
        setResults({
          found: false,
          message: "User not found in database"
        })
      }
    } catch (err: any) {
      setError(`Search failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkUserIssues = (userData: any) => {
    const issues = []
    
    // Check required fields
    if (!userData.username) issues.push("Missing username")
    if (!userData.email) issues.push("Missing email")
    if (!userData.createdAt) issues.push("Missing createdAt timestamp")
    
    // Check ELO structure
    if (!userData.elo) {
      issues.push("Missing ELO object")
    } else {
      if (typeof userData.elo.math !== 'number') issues.push("Invalid math ELO")
      if (typeof userData.elo.bahasa !== 'number') issues.push("Invalid bahasa ELO")
      if (typeof userData.elo.english !== 'number') issues.push("Invalid english ELO")
    }
    
    // Check boolean fields
    if (typeof userData.placementTestCompleted !== 'boolean') {
      issues.push("Invalid placementTestCompleted field")
    }
    
    return issues
  }

  const fixUserIssues = async () => {
    if (!results?.user?.id) return
    
    setLoading(true)
    setError("")
    
    try {
      const fixes: any = {}
      
      // Fix missing ELO structure
      if (!results.user.elo || typeof results.user.elo !== 'object') {
        fixes.elo = {
          math: 1000,
          bahasa: 1000,
          english: 1000
        }
      } else {
        const elo = { ...results.user.elo }
        if (typeof elo.math !== 'number') elo.math = 1000
        if (typeof elo.bahasa !== 'number') elo.bahasa = 1000
        if (typeof elo.english !== 'number') elo.english = 1000
        fixes.elo = elo
      }
      
      // Fix missing boolean fields
      if (typeof results.user.placementTestCompleted !== 'boolean') {
        fixes.placementTestCompleted = false
      }
      
      // Fix missing timestamps
      if (!results.user.createdAt) {
        fixes.createdAt = new Date()
      }
      
      // Apply fixes
      await updateDoc(doc(db, "users", results.user.id), fixes)
      
      // Refresh results
      await searchUser()
      
    } catch (err: any) {
      setError(`Fix failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async () => {
    if (!results?.user?.id) return
    
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }
    
    setLoading(true)
    setError("")
    
    try {
      await deleteDoc(doc(db, "users", results.user.id))
      setResults(null)
      setUserId("")
      setUserEmail("")
    } catch (err: any) {
      setError(`Delete failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createTestUser = async () => {
    setLoading(true)
    setError("")
    
    try {
      const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        elo: {
          math: 1000,
          bahasa: 1000,
          english: 1000
        },
        placementTestCompleted: false,
        createdAt: new Date()
      }
      
      const docRef = await addDoc(collection(db, "users"), testUser)
      setUserId(docRef.id)
      await searchUser()
      
    } catch (err: any) {
      setError(`Test user creation failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/80 border-2 border-red-400 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h1 className="font-pixel text-2xl text-red-400">TROUBLESHOOTING TOOLS</h1>
          </div>
          <p className="font-terminal text-cyan-300">
            Debug user registration and Firestore document issues
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/80 border-2 border-cyan-400 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-5 h-5 text-cyan-400" />
            <h2 className="font-pixel text-lg text-cyan-400">USER LOOKUP</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-terminal text-cyan-300 mb-2">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 text-cyan-300 font-terminal px-3 py-2 focus:border-cyan-400 focus:outline-none"
                placeholder="Enter user document ID"
              />
            </div>
            <div>
              <label className="block font-terminal text-cyan-300 mb-2">Email</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 text-cyan-300 font-terminal px-3 py-2 focus:border-cyan-400 focus:outline-none"
                placeholder="Enter user email"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={searchUser}
              disabled={loading}
              className="bg-cyan-600/80 border-2 border-cyan-400 text-cyan-300 font-pixel px-4 py-2 hover:bg-cyan-600 transition-colors disabled:opacity-50"
            >
              <Search className="w-4 h-4 inline mr-2" />
              {loading ? 'SEARCHING...' : 'SEARCH USER'}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={createTestUser}
              disabled={loading}
              className="bg-green-600/80 border-2 border-green-400 text-green-300 font-pixel px-4 py-2 hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              CREATE TEST USER
            </motion.button>
          </div>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-900/50 border-2 border-red-400 p-4 mb-6"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="font-pixel text-red-400">ERROR</span>
            </div>
            <p className="font-terminal text-red-300 mt-2">{error}</p>
          </motion.div>
        )}

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/80 border-2 border-cyan-400 p-6"
          >
            {results.found ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h3 className="font-pixel text-lg text-green-400">USER FOUND</h3>
                </div>
                
                {/* User Data */}
                <div className="bg-slate-900/50 border border-slate-600 p-4 mb-4">
                  <h4 className="font-pixel text-cyan-400 mb-2">USER DATA</h4>
                  <div className="font-terminal text-sm text-cyan-300 space-y-1">
                    <div><span className="text-slate-400">ID:</span> {results.user.id}</div>
                    <div><span className="text-slate-400">Username:</span> {results.user.username || 'N/A'}</div>
                    <div><span className="text-slate-400">Email:</span> {results.user.email || 'N/A'}</div>
                    <div><span className="text-slate-400">Created:</span> {results.user.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}</div>
                    <div><span className="text-slate-400">Placement Test:</span> {results.user.placementTestCompleted ? 'Completed' : 'Not Completed'}</div>
                    <div><span className="text-slate-400">ELO Math:</span> {results.user.elo?.math || 'N/A'}</div>
                    <div><span className="text-slate-400">ELO Bahasa:</span> {results.user.elo?.bahasa || 'N/A'}</div>
                    <div><span className="text-slate-400">ELO English:</span> {results.user.elo?.english || 'N/A'}</div>
                  </div>
                </div>
                
                {/* Issues */}
                {results.issues.length > 0 ? (
                  <div className="bg-red-900/30 border border-red-600 p-4 mb-4">
                    <h4 className="font-pixel text-red-400 mb-2">ISSUES DETECTED</h4>
                    <ul className="font-terminal text-sm text-red-300 space-y-1">
                      {results.issues.map((issue: string, index: number) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-900/30 border border-green-600 p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="font-pixel text-green-400">NO ISSUES DETECTED</span>
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={searchUser}
                    disabled={loading}
                    className="bg-blue-600/80 border-2 border-blue-400 text-blue-300 font-pixel px-4 py-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    REFRESH
                  </motion.button>
                  
                  {results.issues.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fixUserIssues}
                      disabled={loading}
                      className="bg-yellow-600/80 border-2 border-yellow-400 text-yellow-300 font-pixel px-4 py-2 hover:bg-yellow-600 transition-colors disabled:opacity-50"
                    >
                      <Edit className="w-4 h-4 inline mr-2" />
                      FIX ISSUES
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={deleteUser}
                    disabled={loading}
                    className="bg-red-600/80 border-2 border-red-400 text-red-300 font-pixel px-4 py-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    DELETE USER
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="font-pixel text-red-400">{results.message}</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
