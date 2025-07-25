// Integrated Socket Game Server for Next.js custom server
const path = require('path')

// Import modules with absolute paths from project root
const { generateGeminiQuizQuestions } = require(path.join(process.cwd(), 'lib', 'gemini-service'))
const { createDuel, updateDuel, getUserById, updateUsersElo, getUserEloForSubject } = require(path.join(process.cwd(), 'lib', 'firebase', 'firestore'))
const { calculateEloRating } = require(path.join(process.cwd(), 'lib', 'elo'))

class SocketGameServer {
  constructor(io) {
    this.io = io
    this.matchmakingQueue = new Map() // subject -> players
    this.activeSessions = new Map() // duelId -> session
    this.playerSessions = new Map() // socketId -> duelId
    
    this.setupEventHandlers()
    console.log("🎮 Socket game server initialized")
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("🔌 Player connected:", socket.id)

      socket.on("join-queue", async (data) => {
        await this.handleJoinQueue(socket, data)
      })

      socket.on("leave-queue", () => {
        this.handleLeaveQueue(socket)
      })

      socket.on("join-game", (duelId) => {
        this.handleJoinGame(socket, duelId)
      })

      socket.on("player-answer", async (data) => {
        await this.handlePlayerAnswer(socket, data)
      })

      socket.on("disconnect", () => {
        console.log("🔌 Player disconnected:", socket.id)
        this.handleDisconnect(socket)
      })
    })
  }

  // Copy all your existing methods from socket-server.ts here
  // handleJoinQueue, handleLeaveQueue, createGameSession, etc.
  
  async handleJoinQueue(socket, data) {
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

    if (!this.matchmakingQueue.has(data.subject)) {
      this.matchmakingQueue.set(data.subject, [])
    }

    const queue = this.matchmakingQueue.get(data.subject)
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

    await this.tryMatchmaking(data.subject)
  }

  // Add other methods from your socket-server.ts...
  // For brevity, I'm not copying all methods, but you should copy them all
}

module.exports = { SocketGameServer }
