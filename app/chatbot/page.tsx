"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, User, Send, Zap, Brain, Gamepad2, MessageSquare, Sparkles, ChevronDown, ChevronUp } from "lucide-react" // Import Chevron icons
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function Chat() {
  const { user, userProfile } = useAuth()
  const username = userProfile?.username || "Commander"
  const [userInput, setUserInput] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hello ${username}! ✨ Your study arena is ready. Let’s level up your knowledge today!` },
  ])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // New state for controlling quick commands visibility
  const [showQuickCommands, setShowQuickCommands] = useState<boolean>(true) // Start visible

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    const userMessage: Message = { role: "user", content: message }
    const assistantPlaceholder: Message = { role: "assistant", content: "" }
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      if (!response.ok || !response.body) {
        throw new Error("Network response was not ok.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          const updatedLastMessage = { ...lastMessage, content: lastMessage.content + chunk }
          return [...prev.slice(0, -1), updatedLastMessage]
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1]
        const updatedLastMessage = { ...lastMessage, content: "SYSTEM ERROR. CONNECTION LOST. PLEASE TRY AGAIN." }
        return [...prev.slice(0, -1), updatedLastMessage]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    sendMessage(userInput)
    setUserInput("")
  }

  const handleSuggestedPromptClick = (prompt: string) => {
    sendMessage(prompt)
  }

  const toggleQuickCommands = () => {
    setShowQuickCommands((prev) => !prev)
  }

  const suggestedPrompts = [
    { text: "Tell me how games help with learning", icon: Brain },
    { text: "Give me a fun fact about studying with games", icon: Sparkles },
    { text: "Why is gamification good for students?", icon: Zap },
  ]

  return (
    <div className="flex flex-col h-screen bg-retro-darker text-cyan-400">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-retro-dark p-6 border-b-2 border-cyan-400 shadow-lg shadow-cyan-400/20"
      >
        <div className="flex items-center justify-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <Bot className="w-10 h-10 text-cyan-400" />
          </motion.div>
          <h1 className="font-pixel text-4xl text-cyan-400 tracking-wider glitch" data-text="ECHO v1">
            ECHO v1
          </h1>
          <MessageSquare className="w-8 h-8 text-pink-400" />
        </div>
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-4"></div>
      </motion.header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`flex items-start gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center border-2 border-cyan-400"
                >
                  <Bot className="w-5 h-5 text-slate-900" />
                </motion.div>
              )}

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className={`max-w-xl lg:max-w-3xl px-6 py-4 border-2 relative ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-400 text-blue-100"
                    : "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-cyan-400 text-cyan-100"
                }`}
                style={{
                  clipPath:
                    msg.role === "user"
                      ? "polygon(0 0, 100% 0, 100% 100%, 15px 100%, 0 calc(100% - 15px))"
                      : "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)",
                }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${
                    msg.role === "user" ? "from-blue-400/20 to-purple-400/20" : "from-cyan-400/20 to-green-400/20"
                  } opacity-50 blur-sm -z-10`}
                ></div>

                <p className="font-terminal text-base sm:text-lg leading-relaxed whitespace-pre-wrap font-light">{msg.content}</p>
              </motion.div>

              {msg.role === "user" && (
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center border-2 border-blue-400"
                >
                  <User className="w-5 h-5 text-slate-900" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1].role === "assistant" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-start"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center border-2 border-cyan-400">
                <Bot className="w-5 h-5 text-slate-900" />
              </div>
              <div
                className="px-6 py-4 border-2 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-cyan-400"
                style={{
                  clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)",
                }}
              >
                <div className="flex items-center space-x-2">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
                    className="text-cyan-400 font-pixel text-lg"
                  >
                    ●
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.3 }}
                    className="text-pink-400 font-pixel text-lg"
                  >
                    ●
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.6 }}
                    className="text-yellow-400 font-pixel text-lg"
                  >
                    ●
                  </motion.span>
                  <span className="font-terminal text-base text-cyan-300 ml-2 font-light">PROCESSING...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-retro-dark border-t-2 border-cyan-400 shadow-lg shadow-cyan-400/20"
      >
        {/* Toggle button for Quick Commands */}
        <div className="flex items-center justify-center mb-6">
          <button
            onClick={toggleQuickCommands}
            className="flex items-center gap-3 font-pixel text-lg text-pink-400 tracking-wider cursor-pointer hover:text-cyan-400 transition-colors"
          >
            <Gamepad2 className="w-6 h-6" />
            <h3>QUICK COMMANDS</h3>
            <motion.div
              initial={false}
              animate={{ rotate: showQuickCommands ? 180 : 0 }} // Rotate icon
              transition={{ duration: 0.3 }}
            >
              {showQuickCommands ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </motion.div>
          </button>
        </div>

        {/* Conditionally render and animate the quick commands */}
        <AnimatePresence>
          {showQuickCommands && !isLoading && (
            <motion.div
              key="quick-commands" // Unique key for AnimatePresence
              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6" // Retain margin-bottom when visible
            >
              <div className="flex flex-wrap justify-center gap-3">
                {suggestedPrompts.map((prompt, index) => {
                  const IconComponent = prompt.icon
                  return (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSuggestedPromptClick(prompt.text)}
                      className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-2 border-cyan-400/50 hover:border-cyan-400 transition-all font-terminal text-sm text-cyan-300 hover:text-cyan-100 font-light"
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {prompt.text.length > 25 ? prompt.text.substring(0, 25) + "..." : prompt.text}
                      </span>
                      <span className="sm:hidden">Command {index + 1}</span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleFormSubmit} className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={isLoading ? "Awaiting response..." : "> Enter command..."}
              disabled={isLoading}
              className="w-full p-4 sm:p-5 bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-2 border-cyan-400/50 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/50 disabled:opacity-50 font-terminal transition-all text-base sm:text-lg font-light"
              autoComplete="off"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-blue-400/5 pointer-events-none"></div>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="retro-button font-pixel px-8 py-4 sm:px-10 sm:py-5 text-slate-900 tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base sm:text-lg"
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                >
                  <Zap className="w-5 h-5" />
                </motion.div>
                THINKING...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                ASK
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}