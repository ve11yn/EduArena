"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bug, Eye, EyeOff } from "lucide-react"

interface DebugOverlayProps {
  enabled?: boolean
}

export function DebugOverlay({ enabled = false }: DebugOverlayProps) {
  const [isVisible, setIsVisible] = useState(enabled)

  if (!enabled && process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <>
      {/* Debug Toggle Button */}
      <motion.button
        className="fixed top-4 right-4 z-[9999] bg-purple-600/90 border-2 border-purple-400 text-purple-200 p-2 font-pixel text-xs hover:bg-purple-600 transition-colors"
        onClick={() => setIsVisible(!isVisible)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ 
          zIndex: 9999, 
          position: 'fixed',
          pointerEvents: 'auto'
        }}
      >
        <Bug className="w-4 h-4 inline mr-1" />
        DEBUG
        {isVisible ? <EyeOff className="w-3 h-3 inline ml-1" /> : <Eye className="w-3 h-3 inline ml-1" />}
      </motion.button>

      {/* Debug Overlay */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[9998]"
            style={{ zIndex: 9998 }}
          >
            {/* Z-index visualization */}
            <div className="absolute top-20 right-4 bg-slate-900/95 border-2 border-purple-400 p-4 font-terminal text-xs text-purple-200 max-w-xs">
              <div className="font-pixel text-sm text-purple-400 mb-2">Z-INDEX DEBUG</div>
              <div className="space-y-1">
                <div>Background Grid: z-0</div>
                <div>Content: z-10</div>
                <div>Interactive: z-40</div>
                <div>Buttons: z-50</div>
                <div>Debug: z-9999</div>
              </div>
              <div className="mt-3 pt-2 border-t border-purple-600">
                <div className="font-pixel text-xs text-purple-400">TIPS:</div>
                <div className="text-xs mt-1">
                  • All buttons should be clickable
                  • Hover effects should work
                  • No overlapping issues
                </div>
              </div>
            </div>

            {/* Visual grid for debugging positioning */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,0,255,0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,0,255,0.3) 1px, transparent 1px)
                `,
                backgroundSize: "50px 50px",
                pointerEvents: 'none'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
