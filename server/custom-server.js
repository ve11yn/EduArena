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

// Mock quiz data generator (replace with your actual quiz service)
const generateMockQuiz = (subject, difficulty = 'medium') => {
  const questions = {
    math: [
      {
        question: "What is 15 + 27?",
        options: ["40", "42", "44", "46"],
        correct_answer: 1,
        explanation: "15 + 27 = 42"
      },
      {
        question: "What is the square root of 64?",
        options: ["6", "7", "8", "9"],
        correct_answer: 2,
        explanation: "√64 = 8"
      },
      {
        question: "What is 12 × 8?",
        options: ["84", "92", "96", "104"],
        correct_answer: 2,
        explanation: "12 × 8 = 96"
      },
      {
        question: "What is 144 ÷ 12?",
        options: ["10", "11", "12", "13"],
        correct_answer: 2,
        explanation: "144 ÷ 12 = 12"
      },
      {
        question: "What is 7² (7 squared)?",
        options: ["42", "47", "49", "56"],
        correct_answer: 2,
        explanation: "7² = 7 × 7 = 49"
      }
    ],
    science: [
      {
        question: "What is the chemical symbol for water?",
        options: ["H2O", "CO2", "NaCl", "CH4"],
        correct_answer: 0,
        explanation: "Water is composed of 2 hydrogen atoms and 1 oxygen atom"
      },
      {
        question: "How many planets are in our solar system?",
        options: ["7", "8", "9", "10"],
        correct_answer: 1,
        explanation: "There are 8 planets in our solar system"
      },
      {
        question: "What gas do plants absorb from the atmosphere?",
        options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"],
        correct_answer: 2,
        explanation: "Plants absorb CO2 during photosynthesis"
      },
      {
        question: "What is the speed of light in vacuum?",
        options: ["299,792,458 m/s", "300,000,000 m/s", "299,000,000 m/s", "301,000,000 m/s"],
        correct_answer: 0,
        explanation: "The speed of light in vacuum is exactly 299,792,458 meters per second"
      },
      {
        question: "What is the hardest natural substance?",
        options: ["Gold", "Iron", "Diamond", "Quartz"],
        correct_answer: 2,
        explanation: "Diamond is the hardest natural substance on Earth"
      }
    ]
  }
  
  return questions[subject] || questions.math
}

// Calculate ELO changes
const calculateEloChange = (playerElo, opponentElo, playerWon, kFactor = 32) => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  const actualScore = playerWon ? 1 : 0
  const eloChange = Math.round(kFactor * (actualScore - expectedScore))
  
  return {
    change: eloChange,
    newElo: playerElo + eloChange
  }
}

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

  // Game state management
  const matchmakingQueue = new Map() // subject -> players
  const activeSessions = new Map() // duelId -> session
  const playerSessions = new Map() // socketId -> duelId

  // Game session structure
  class GameSession {
    constructor(duelId, player1, player2, subject) {
      this.duelId = duelId
      this.player1 = player1
      this.player2 = player2
      this.subject = subject
      this.quizData = generateMockQuiz(subject)
      this.currentQuestionIndex = 0
      this.maxQuestions = 5
      this.player1Answers = []
      this.player2Answers = []
      this.player1Times = []
      this.player2Times = []
      this.player1Score = 0
      this.player2Score = 0
      this.status = 'in_progress'
      this.createdAt = Date.now()
      this.questionStartTime = null
      this.answersReceived = 0
    }

    startQuestion() {
      this.questionStartTime = Date.now()
      this.answersReceived = 0
    }

    submitAnswer(playerId, answer, timeElapsed) {
      const isPlayer1 = playerId === this.player1.id
      const currentQuestion = this.quizData[this.currentQuestionIndex]
      const isCorrect = parseInt(answer) === currentQuestion.correct_answer
      
      if (isPlayer1) {
        this.player1Answers[this.currentQuestionIndex] = isCorrect
        this.player1Times[this.currentQuestionIndex] = timeElapsed
        if (isCorrect) this.player1Score++
      } else {
        this.player2Answers[this.currentQuestionIndex] = isCorrect
        this.player2Times[this.currentQuestionIndex] = timeElapsed
        if (isCorrect) this.player2Score++
      }
      
      this.answersReceived++
      
      return {
        correct: isCorrect,
        correctAnswer: currentQuestion.correct_answer,
        explanation: currentQuestion.explanation,
        isPlayer1
      }
    }

    isQuestionComplete() {
      return this.answersReceived >= 2
    }

    moveToNextQuestion() {
      this.currentQuestionIndex++
      this.answersReceived = 0
    }

    isGameComplete() {
      return this.currentQuestionIndex >= this.maxQuestions
    }

    getWinner() {
      if (this.player1Score > this.player2Score) return this.player1.id
      if (this.player2Score > this.player1Score) return this.player2.id
      return null // Draw
    }

    getFinalScores() {
      return {
        player1: this.player1Score,
        player2: this.player2Score
      }
    }

    calculateEloChanges() {
      const winner = this.getWinner()
      const player1Won = winner === this.player1.id
      const player2Won = winner === this.player2.id
      
      if (winner === null) {
        // Draw - smaller ELO changes
        const player1Change = calculateEloChange(this.player1.userElo, this.player2.userElo, 0.5, 16)
        const player2Change = calculateEloChange(this.player2.userElo, this.player1.userElo, 0.5, 16)
        
        return {
          player: player1Change,
          opponent: player2Change
        }
      }
      
      const player1Change = calculateEloChange(this.player1.userElo, this.player2.userElo, player1Won)
      const player2Change = calculateEloChange(this.player2.userElo, this.player1.userElo, player2Won)
      
      return {
        player: player1Change,
        opponent: player2Change
      }
    }
  }

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
        userElo: data.userElo || 1000,
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

      // Simple matchmaking - match any 2 players
      if (queue.length >= 2) {
        const player1 = queue.shift()
        const player2 = queue.shift()
        
        const duelId = `duel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        console.log(`🎯 Match found! ${player1.username} vs ${player2.username} - Duel ID: ${duelId}`)
        
        // Create game session
        const gameSession = new GameSession(duelId, player1, player2, data.subject)
        activeSessions.set(duelId, gameSession)
        playerSessions.set(player1.socketId, duelId)
        playerSessions.set(player2.socketId, duelId)
        
        // Join both players to the same room
        const player1Socket = io.sockets.sockets.get(player1.socketId)
        const player2Socket = io.sockets.sockets.get(player2.socketId)

        if (player1Socket && player2Socket) {
          player1Socket.join(duelId)
          player2Socket.join(duelId)
          
          // Start the game
          gameSession.startQuestion()
          
          io.to(duelId).emit("game-start", {
            duelId: duelId,
            subject: data.subject,
            quizData: gameSession.quizData,
            questionIndex: gameSession.currentQuestionIndex,
            maxQuestions: gameSession.maxQuestions,
            opponent: {
              player1: { username: player1.username, elo: player1.userElo },
              player2: { username: player2.username, elo: player2.userElo }
            }
          })
          
          console.log(`🎮 Game started: ${duelId}`)
        }
      }
    })

    socket.on("join-game", (duelId) => {
      console.log(`🎮 Player ${socket.id} joining game: ${duelId}`)
      
      const session = activeSessions.get(duelId)
      if (session) {
        socket.join(duelId)
        playerSessions.set(socket.id, duelId)
        
        // Send current game state
        socket.emit("game-start", {
          duelId: duelId,
          subject: session.subject,
          quizData: session.quizData,
          questionIndex: session.currentQuestionIndex,
          maxQuestions: session.maxQuestions,
          scores: {
            player: session.player1Score,
            opponent: session.player2Score
          }
        })
      } else {
        socket.emit("error", "Game session not found")
      }
    })

    socket.on("player-answer", async (data) => {
      const duelId = playerSessions.get(socket.id)
      const session = activeSessions.get(duelId)
      
      if (!session) {
        socket.emit("error", "Game session not found")
        return
      }
      
      console.log(`📝 Answer received from ${socket.id}: ${data.answer} (time: ${data.timeElapsed}ms)`)
      
      // Determine which player this is
      const isPlayer1 = socket.id === session.player1.socketId
      const playerId = isPlayer1 ? session.player1.id : session.player2.id
      
      // Submit the answer
      const result = session.submitAnswer(playerId, data.answer, data.timeElapsed)
      
      // Notify opponent that this player has answered
      socket.to(duelId).emit("opponent-answered")
      
      // Send individual result to the player
      socket.emit("question-result", {
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation,
        scores: {
          player: isPlayer1 ? session.player1Score : session.player2Score,
          opponent: isPlayer1 ? session.player2Score : session.player1Score
        }
      })
      
      // Check if both players have answered
      if (session.isQuestionComplete()) {
        console.log(`✅ Question ${session.currentQuestionIndex + 1} complete`)
        
        // Move to next question or end game
        if (session.currentQuestionIndex + 1 >= session.maxQuestions) {
          // Game is complete
          console.log(`🏁 Game ${duelId} completed`)
          
          const winner = session.getWinner()
          const finalScores = session.getFinalScores()
          const eloChanges = session.calculateEloChanges()
          
          io.to(duelId).emit("game-end", {
            winner: winner,
            finalScores: {
              player: finalScores.player1,
              opponent: finalScores.player2
            },
            eloChanges: eloChanges,
            totalQuestions: session.maxQuestions
          })
          
          // Clean up
          activeSessions.delete(duelId)
          playerSessions.delete(session.player1.socketId)
          playerSessions.delete(session.player2.socketId)
          
        } else {
          // Move to next question
          session.moveToNextQuestion()
          session.startQuestion()
          
          setTimeout(() => {
            io.to(duelId).emit("next-question", {
              questionIndex: session.currentQuestionIndex,
              scores: {
                player1: session.player1Score,
                player2: session.player2Score
              }
            })
          }, 3000) // 3 second delay for feedback display
        }
      }
    })

    socket.on("leave-queue", () => {
      console.log(`🚪 Player ${socket.id} leaving queue`)
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

    socket.on("leave-game", () => {
      const duelId = playerSessions.get(socket.id)
      if (duelId) {
        console.log(`🚪 Player ${socket.id} leaving game ${duelId}`)
        
        // Notify other player
        socket.to(duelId).emit("opponent-left")
        
        // Clean up session if needed
        const session = activeSessions.get(duelId)
        if (session) {
          // You might want to implement forfeit logic here
          activeSessions.delete(duelId)
        }
        
        playerSessions.delete(socket.id)
        socket.leave(duelId)
      }
    })

    socket.on("disconnect", () => {
      console.log("🔌 Player disconnected:", socket.id)
      
      // Clean up player from queues
      for (const [subject, queue] of matchmakingQueue.entries()) {
        const index = queue.findIndex((p) => p.socketId === socket.id)
        if (index !== -1) {
          queue.splice(index, 1)
          break
        }
      }
      
      // Clean up from active games
      const duelId = playerSessions.get(socket.id)
      if (duelId) {
        socket.to(duelId).emit("opponent-disconnected")
        
        // Optionally end the game or give the remaining player a win
        const session = activeSessions.get(duelId)
        if (session) {
          // Implement disconnect handling logic here
          console.log(`⚠️ Player disconnected from active game ${duelId}`)
        }
        
        playerSessions.delete(socket.id)
      }
    })

    // Heartbeat to keep connection alive
    socket.on("ping", () => {
      socket.emit("pong")
    })
  })

  // Cleanup old sessions periodically
  setInterval(() => {
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30 minutes
    
    for (const [duelId, session] of activeSessions.entries()) {
      if (now - session.createdAt > maxAge) {
        console.log(`🧹 Cleaning up old session: ${duelId}`)
        activeSessions.delete(duelId)
      }
    }
  }, 5 * 60 * 1000) // Check every 5 minutes

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`🚀 Next.js app ready on http://${hostname}:${port}`)
    console.log(`🎮 Socket.io server running on the same port`)
    console.log(`📊 Game features enabled:`)
    console.log(`  - Real-time matchmaking`)
    console.log(`  - Live quiz battles`)
    console.log(`  - ELO ranking system`)
    console.log(`  - Auto session cleanup`)
  })
})