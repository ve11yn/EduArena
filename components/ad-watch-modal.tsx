import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Heart, Clock } from 'lucide-react'

interface AdWatchModalProps {
  isOpen: boolean
  onClose: () => void
  onAdComplete: () => void
  currentLives: number
}

export const AdWatchModal: React.FC<AdWatchModalProps> = ({
  isOpen,
  onClose,
  onAdComplete,
  currentLives
}) => {
  const [isWatching, setIsWatching] = useState(false)
  const [adProgress, setAdProgress] = useState(0)
  const [adCompleted, setAdCompleted] = useState(false)

  const startAd = () => {
    setIsWatching(true)
    setAdProgress(0)
    setAdCompleted(false)

    // Simulate a 15-second ad
    const interval = setInterval(() => {
      setAdProgress(prev => {
        const next = prev + 1
        if (next >= 15) {
          clearInterval(interval)
          setAdCompleted(true)
          setIsWatching(false)
          return 15
        }
        return next
      })
    }, 1000)
  }

  const claimReward = () => {
    onAdComplete()
    onClose()
    setAdProgress(0)
    setAdCompleted(false)
  }

  const handleClose = () => {
    if (!isWatching) {
      onClose()
      setAdProgress(0)
      setAdCompleted(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800 border-2 border-cyan-400 p-6 max-w-md w-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-pixel text-xl text-cyan-400">WATCH AD FOR LIFE</h2>
            {!isWatching && (
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Current Status */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="font-pixel text-sm text-red-400">CURRENT LIVES</span>
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart 
                    key={i} 
                    className={`w-4 h-4 ${i < currentLives ? 'text-red-400 fill-red-400' : 'text-slate-600'}`} 
                  />
                ))}
              </div>
              <span className="font-pixel text-sm text-cyan-400">{currentLives}/3</span>
            </div>
            
            {!adCompleted && (
              <div className="text-center">
                <p className="font-terminal text-cyan-300 text-sm mb-4">
                  Watch a 15-second ad to earn +1 life!
                </p>
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Heart className="w-4 h-4 fill-green-400" />
                  <span className="font-pixel text-sm">+1 LIFE REWARD</span>
                </div>
              </div>
            )}
          </div>

          {/* Ad Content */}
          <div className="bg-slate-900/50 border border-slate-600 p-6 mb-6 text-center min-h-[200px] flex items-center justify-center">
            {!isWatching && !adCompleted && (
              <div className="text-center">
                <div className="text-6xl mb-4">🎬</div>
                <p className="font-terminal text-slate-300 text-sm mb-4">
                  Ready to watch ad?
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startAd}
                  className="retro-button font-pixel text-slate-900 px-6 py-3 flex items-center gap-2 mx-auto"
                >
                  <Play className="w-4 h-4" />
                  START AD
                </motion.button>
              </div>
            )}

            {isWatching && (
              <div className="text-center w-full">
                <div className="text-4xl mb-4">📺</div>
                <p className="font-pixel text-cyan-400 mb-4">WATCHING AD...</p>
                <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-green-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(adProgress / 15) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 font-terminal text-sm text-slate-300">
                  <Clock className="w-4 h-4" />
                  <span>{15 - adProgress}s remaining</span>
                </div>
                <p className="font-terminal text-xs text-slate-400 mt-2">
                  Don't close this window!
                </p>
              </div>
            )}

            {adCompleted && (
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <p className="font-pixel text-green-400 mb-4">AD COMPLETE!</p>
                <p className="font-terminal text-cyan-300 text-sm mb-4">
                  You earned +1 life!
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={claimReward}
                  className="retro-button font-pixel text-slate-900 px-6 py-3 flex items-center gap-2 mx-auto"
                >
                  <Heart className="w-4 h-4" />
                  CLAIM LIFE
                </motion.button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="font-terminal text-xs text-slate-400">
              {currentLives < 3 ? 
                `You can watch ${3 - currentLives} more ad${3 - currentLives > 1 ? 's' : ''} to fill your lives` : 
                'Your lives are already full!'
              }
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
