const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { config } = require('dotenv')
const path = require('path')

// Load environment variables
config({ path: '.env.local' })

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0' // Allow external connections for Railway
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Import and initialize the Socket server
  const { Server } = require('socket.io')
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? true // Allow all origins in production
        : ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"]
    }
  })

  // Complete socket server with quiz functionality
  const matchmakingQueue = new Map() // subject -> players
  const activeSessions = new Map() // duelId -> session
  const playerSessions = new Map() // socketId -> duelId

  io.on("connection", (socket) => {
    console.log("🔌 Player connected:", socket.id)

    // Add catch-all event handler
    socket.onAny((eventName, ...args) => {
      console.log("📡 Server received event:", eventName, "from", socket.id)
      if (args.length > 0) {
        console.log("📡 Event data:", args[0])
      }
    })

    socket.on("join-queue", async (data) => {
      console.log("🎯 Player joining queue:", data)
      
      const player = {
        id: `${socket.id}_${Date.now()}`,
        socketId: socket.id,
        userId: data.userId,
        username: data.username,
        subject: data.subject,
        userElo: data.userElo,
        joinedAt: Date.now(),
      }

      // Initialize queue for subject if not exists
      if (!matchmakingQueue.has(data.subject)) {
        matchmakingQueue.set(data.subject, [])
      }

      const queue = matchmakingQueue.get(data.subject)
      
      // Remove player if already in queue (reconnection case)
      const existingIndex = queue.findIndex((p) => p.userId === data.userId)
      if (existingIndex !== -1) {
        queue.splice(existingIndex, 1)
      }

      // Add player to queue
      queue.push(player)
      console.log(`📊 Queue status for ${data.subject}: ${queue.length} players`)

      // Send queue status
      socket.emit("queue-status", {
        position: queue.length,
        playersInQueue: queue.length,
      })

      // Try to find a match
      if (queue.length >= 2) {
        const player1 = queue.shift()
        const player2 = queue.shift()
        
        console.log(`🎯 Match found! ${player1.username} vs ${player2.username}`)
        
        // Verify both players are still connected before creating session
        const player1Socket = io.sockets.sockets.get(player1.socketId)
        const player2Socket = io.sockets.sockets.get(player2.socketId)
        
        if (!player1Socket) {
          console.log("⚠️ Player1 disconnected, putting player2 back in queue")
          queue.unshift(player2) // Put player2 back at front of queue
          return
        }
        
        if (!player2Socket) {
          console.log("⚠️ Player2 disconnected, putting player1 back in queue")
          queue.unshift(player1) // Put player1 back at front of queue
          return
        }
        
        // Create game session
        await createGameSession(player1, player2, data.subject)
      }
    })

    socket.on("join-game", async (data) => {
      console.log("🎮 Player attempting to join game:", data)
      console.log("📊 Active sessions:", Array.from(activeSessions.keys()))
      
      let session = activeSessions.get(data.duelId)
      if (!session) {
        console.log("❌ Game session not found for duel:", data.duelId)
        console.log("🔄 Creating fallback AI training session...")
        
        // Create a fallback AI training session
        const playerData = {
          userId: data.userId,
          username: `Player_${data.userId.slice(-4)}`,
          socketId: socket.id
        }
        
        const aiOpponent = {
          userId: "bot_intermediate",
          username: "TRAINING_BOT", 
          socketId: "ai_socket"
        }
        
        // Create AI training session
        session = await createAITrainingSession(data.duelId, playerData, aiOpponent, "math")
        activeSessions.set(data.duelId, session)
        playerSessions.set(socket.id, data.duelId)
        
        console.log("✅ Created fallback AI session for:", data.duelId)
        
        // Start the AI training game immediately
        socket.emit("game-start", {
          duelId: data.duelId,
          subject: session.subject,
          quizData: session.questions,
          questionIndex: 0,
          opponent: aiOpponent
        })
        return
      }

      console.log("✅ Session found, updating player socket")
      
      // Update socket mapping
      if (session.player1.userId === data.userId) {
        session.player1.socketId = socket.id
        playerSessions.set(socket.id, data.duelId)
        console.log("🎮 Player1 joined game:", data.duelId)
      } else if (session.player2.userId === data.userId) {
        session.player2.socketId = socket.id
        playerSessions.set(socket.id, data.duelId)
        console.log("🎮 Player2 joined game:", data.duelId)
      }

      // Check if both players are ready and start game
      const bothPlayersJoined = session.player1.socketId && session.player2.socketId
      if (bothPlayersJoined) {
        console.log("👥 Both players joined, starting game!")
        startGame(data.duelId)
      }
    })

    socket.on("test-connection", (data) => {
      console.log("🧪 Test connection received:", data)
      socket.emit("test-response", { message: "Server received test", socketId: socket.id })
    })

    socket.on("leave-queue", () => {
      for (const [subject, queue] of matchmakingQueue.entries()) {
        const index = queue.findIndex((p) => p.socketId === socket.id)
        if (index !== -1) {
          queue.splice(index, 1)
          console.log(`🚪 Player left ${subject} queue`)
          break
        }
      }
    })

    socket.on("disconnect", () => {
      console.log("🔌 Player disconnected:", socket.id)
      
      // Clean up player from queues
      let playerRemoved = false
      for (const [subject, queue] of matchmakingQueue.entries()) {
        const index = queue.findIndex((p) => p.socketId === socket.id)
        if (index !== -1) {
          const removedPlayer = queue[index]
          queue.splice(index, 1)
          console.log(`🚪 Removed ${removedPlayer.username} from ${subject} queue`)
          playerRemoved = true
          break
        }
      }
      
      // Clean up from active sessions
      const sessionId = playerSessions.get(socket.id)
      if (sessionId) {
        console.log(`🎮 Cleaning up session for disconnected player: ${sessionId}`)
        playerSessions.delete(socket.id)
        // Could also pause/end the game session here if needed
      }
      
      if (!playerRemoved) {
        console.log("ℹ️ Disconnected player was not in any queue")
      }
    })
  })

  async function createGameSession(player1, player2, subject) {
    try {
      console.log("🎮 Creating game session...")
      const startTime = Date.now()

      // Generate a unique duel ID
      const duelId = `duel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // For now, use static questions to avoid Gemini API issues
      const staticQuestions = [
        {
          question: "What is 15 + 27?",
          options: ["42", "41", "43", "40"],
          correct_answer: 0,
          explanation: "15 + 27 = 42"
        },
        {
          question: "What is 8 × 6?",
          options: ["46", "48", "50", "44"],
          correct_answer: 1,
          explanation: "8 × 6 = 48"
        },
        {
          question: "What is 100 ÷ 4?",
          options: ["20", "25", "30", "24"],
          correct_answer: 1,
          explanation: "100 ÷ 4 = 25"
        },
        {
          question: "What is 12²?",
          options: ["144", "124", "164", "134"],
          correct_answer: 0,
          explanation: "12 × 12 = 144"
        },
        {
          question: "What is √64?",
          options: ["6", "8", "10", "7"],
          correct_answer: 1,
          explanation: "√64 = 8"
        }
      ]

      console.log("📝 Using static quiz questions for faster deployment")

      // Create game session
      const session = {
        duelId,
        player1,
        player2,
        subject,
        quizData: staticQuestions,
        currentQuestionIndex: 0,
        player1Score: 0,
        player2Score: 0,
        player1Answers: [],
        player2Answers: [],
        player1Times: [],
        player2Times: [],
        gameStartTime: Date.now(),
        questionStartTime: Date.now(),
      }

      activeSessions.set(duelId, session)
      console.log("✅ Game session created:", duelId)

      // Notify players
      const player1Socket = io.sockets.sockets.get(player1.socketId)
      const player2Socket = io.sockets.sockets.get(player2.socketId)

      console.log("📡 Notifying players of match:")
      console.log("👤 Player1:", player1.username, "Socket exists:", !!player1Socket)
      console.log("👤 Player2:", player2.username, "Socket exists:", !!player2Socket)

      if (player1Socket) {
        player1Socket.emit("match-found", {
          duelId,
          opponent: { username: player2.username, elo: player2.userElo },
          isPlayer1: true,
        })
        console.log("✅ Match-found sent to player1:", player1.username)
      } else {
        console.error("❌ Player1 socket not found:", player1.socketId)
      }

      if (player2Socket) {
        player2Socket.emit("match-found", {
          duelId,
          opponent: { username: player1.username, elo: player1.userElo },
          isPlayer1: false,
        })
        console.log("✅ Match-found sent to player2:", player2.username)
      } else {
        console.error("❌ Player2 socket not found:", player2.socketId)
      }

      console.log("🎮 Game session created, waiting for players to join...")

    } catch (error) {
      console.error("❌ Error creating game session:", error)
      
      const player1Socket = io.sockets.sockets.get(player1.socketId)
      const player2Socket = io.sockets.sockets.get(player2.socketId)
      
      player1Socket?.emit("error", "Failed to create game session")
      player2Socket?.emit("error", "Failed to create game session")
    }
  }

  // Function to create AI training session for fallback
  function createAITrainingSession(duelId, userId) {
    const session = {
      duelId,
      player1: { id: userId, socketId: null, username: `User_${userId.slice(0, 8)}` },
      player2: { id: "bot_intermediate", socketId: null, username: "TRAINING_BOT" },
      subject: "math", // Default subject for fallback
      quizData: getStaticQuizQuestions("math", 5),
      currentQuestionIndex: 0,
      player1Score: 0,
      player2Score: 0,
      status: "waiting"
    }
    activeSessions.set(duelId, session)
    return session
  }

  function startGame(duelId) {
    const session = activeSessions.get(duelId)
    if (!session) {
      console.log("❌ Cannot start game: session not found")
      return
    }

    console.log("🚀 Starting game:", duelId)
    
    const player1Socket = io.sockets.sockets.get(session.player1.socketId)
    const player2Socket = io.sockets.sockets.get(session.player2.socketId)

    if (!player1Socket || !player2Socket) {
      console.log("❌ Cannot start game: not all players connected")
      return
    }

    const gameStartData = {
      quizData: session.quizData,
      currentQuestion: session.quizData[0],
      questionIndex: 0,
      subject: session.subject,
    }

    console.log("📤 Sending game-start to both players")
    player1Socket.emit("game-start", gameStartData)
    player2Socket.emit("game-start", gameStartData)
  }

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`🚀 Next.js app ready on http://${hostname}:${port}`)
    console.log(`🎮 Socket.io server running on the same port`)
    console.log(`🔧 Server Version: custom-server-fixed.js v2.1 (Latest - with fallback sessions)`)
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
})
