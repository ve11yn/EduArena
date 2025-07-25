const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
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

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? true // Allow all origins in production for now
        : ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"]
    }
  })

  // Simple socket handling without external dependencies for now
  // We'll implement the game logic directly here to avoid module resolution issues
  const matchmakingQueue = new Map() // subject -> players
  const activeSessions = new Map() // duelId -> session
  const playerSessions = new Map() // socketId -> duelId

  io.on("connection", (socket) => {
    console.log("🔌 Player connected:", socket.id)

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

      if (!matchmakingQueue.has(data.subject)) {
        matchmakingQueue.set(data.subject, [])
      }

      const queue = matchmakingQueue.get(data.subject)
      const existingIndex = queue.findIndex((p) => p.userId === data.userId)
      if (existingIndex !== -1) {
        queue.splice(existingIndex, 1)
      }

      queue.push(player)
      console.log(`📊 Queue status for ${data.subject}: ${queue.length} players`)

      socket.emit("queue-status", {
        position: queue.length,
        playersInQueue: queue.length,
      })

      // Simple matchmaking - just match any 2 players for now
      if (queue.length >= 2) {
        const player1 = queue.shift()
        const player2 = queue.shift()
        
        console.log(`🎯 Match found! ${player1.username} vs ${player2.username}`)
        
        // For now, just notify players - we can add the full game logic later
        const player1Socket = io.sockets.sockets.get(player1.socketId)
        const player2Socket = io.sockets.sockets.get(player2.socketId)

        if (player1Socket) {
          player1Socket.emit("match-found", {
            duelId: `duel_${Date.now()}`,
            opponent: { username: player2.username, elo: player2.userElo },
            isPlayer1: true,
          })
        }

        if (player2Socket) {
          player2Socket.emit("match-found", {
            duelId: `duel_${Date.now()}`,
            opponent: { username: player1.username, elo: player1.userElo },
            isPlayer1: false,
          })
        }
      }
    })

    socket.on("leave-queue", () => {
      // Remove player from all queues
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
      // Clean up player from queues and sessions
      for (const [subject, queue] of matchmakingQueue.entries()) {
        const index = queue.findIndex((p) => p.socketId === socket.id)
        if (index !== -1) {
          queue.splice(index, 1)
          break
        }
      }
    })
  })

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`🚀 Next.js app ready on http://${hostname}:${port}`)
    console.log(`🎮 Socket.io server running on the same port`)
  })
})
