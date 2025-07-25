import { createServer } from "http"
import { Server } from "socket.io"
import { config } from "dotenv"
import { generateGeminiQuizQuestions } from "../lib/gemini-service"
import { createDuel, updateDuel, getUserById, updateUsersElo, getUserEloForSubject } from "../lib/firebase/firestore"
import { calculateEloRating } from "../lib/elo"

// Load environment variables from .env.local
config({ path: '.env.local' })

interface Player {
  id: string
  socketId: string
  userId: string
  username: string
  subject: string
  userElo: number
  joinedAt: number
}

interface GameSession {
  duelId: string
  player1: Player
  player2: Player
  subject: string
  quizData: any[]
  currentQuestionIndex: number
  player1Score: number
  player2Score: number
  player1Answers: string[]
  player2Answers: string[]
  player1Times: number[]
  player2Times: number[]
  gameStartTime: number
  questionStartTime: number
}

class SocketGameServer {
  private io: Server
  private matchmakingQueue: Map<string, Player[]> = new Map() // subject -> players
  private activeSessions: Map<string, GameSession> = new Map() // duelId -> session
  private playerSessions: Map<string, string> = new Map() // socketId -> duelId

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === "production" ? false : "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    })

    this.setupEventHandlers()
    console.log("🎮 Socket game server initialized")
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("🔌 Player connected:", socket.id)

      socket.on("join-queue", async (data) => {
        await this.handleJoinQueue(socket, data)
      })

      socket.on("leave-queue", () => {
        this.handleLeaveQueue(socket)
      })

      socket.on("join-game", (data) => {
        this.handleJoinGame(socket, data)
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

  private async handleJoinQueue(
    socket: any,
    data: { userId: string; subject: string; userElo: number; username: string },
  ) {
    console.log("🎯 Player joining queue:", data)

    const player: Player = {
      id: `${socket.id}_${Date.now()}`,
      socketId: socket.id,
      userId: data.userId,
      username: data.username,
      subject: data.subject,
      userElo: data.userElo,
      joinedAt: Date.now(),
    }

    // Initialize queue for subject if not exists
    if (!this.matchmakingQueue.has(data.subject)) {
      this.matchmakingQueue.set(data.subject, [])
    }

    const queue = this.matchmakingQueue.get(data.subject)!

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
    await this.tryMatchmaking(data.subject)
  }

  private handleLeaveQueue(socket: any) {
    // Remove player from all queues
    for (const [subject, queue] of this.matchmakingQueue.entries()) {
      const index = queue.findIndex((p) => p.socketId === socket.id)
      if (index !== -1) {
        queue.splice(index, 1)
        console.log(`🚪 Player left ${subject} queue`)
        break
      }
    }
  }

  private async tryMatchmaking(subject: string) {
    const queue = this.matchmakingQueue.get(subject)
    if (!queue || queue.length < 2) return

    // Sort by ELO for better matching
    queue.sort((a, b) => a.userElo - b.userElo)

    // Find the best match (closest ELO)
    let bestMatch: { player1: Player; player2: Player; eloDiff: number } | null = null

    for (let i = 0; i < queue.length - 1; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const eloDiff = Math.abs(queue[i].userElo - queue[j].userElo)
        if (!bestMatch || eloDiff < bestMatch.eloDiff) {
          bestMatch = {
            player1: queue[i],
            player2: queue[j],
            eloDiff,
          }
        }
      }
    }

    if (bestMatch) {
      // Remove matched players from queue
      const player1Index = queue.findIndex((p) => p.id === bestMatch!.player1.id)
      const player2Index = queue.findIndex((p) => p.id === bestMatch!.player2.id)

      if (player1Index !== -1) queue.splice(player1Index, 1)
      if (player2Index !== -1) queue.splice(player2Index > player1Index ? player2Index - 1 : player2Index, 1)

      console.log(
        `🎯 Match found! ${bestMatch.player1.username} vs ${bestMatch.player2.username} (ELO diff: ${bestMatch.eloDiff})`,
      )

      // Create game session
      await this.createGameSession(bestMatch.player1, bestMatch.player2, subject)
    }
  }

  private async createGameSession(player1: Player, player2: Player, subject: string) {
    try {
      console.log("🎮 Creating game session...")

      // Generate quiz questions using Gemini
      console.log("📝 Generating quiz questions for subject:", subject)
      const quizData = await generateGeminiQuizQuestions(subject, "intermediate", 5)
      console.log("📝 Generated quiz questions:", quizData.length)
      
      if (!quizData || quizData.length === 0) {
        throw new Error("No quiz questions were generated")
      }

      // Create duel in Firebase
      console.log("🔥 Creating duel in Firebase...")
      const duelId = await createDuel({
        player1Id: player1.userId,
        player2Id: player2.userId,
        subject: subject as any,
        difficulty: "intermediate",
        quizData,
        currentQuestionIndex: 0,
        player1Answers: [],
        player2Answers: [],
        player1Time: [],
        player2Time: [],
        player1Score: 0,
        player2Score: 0,
        status: "in_progress",
        isTraining: false,
        maxQuestions: 5,
        startedAt: new Date(),
      })

      // Create game session
      const session: GameSession = {
        duelId,
        player1,
        player2,
        subject,
        quizData,
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

      this.activeSessions.set(duelId, session)
      this.playerSessions.set(player1.socketId, duelId)
      this.playerSessions.set(player2.socketId, duelId)

      // Notify players
      const player1Socket = this.io.sockets.sockets.get(player1.socketId)
      const player2Socket = this.io.sockets.sockets.get(player2.socketId)

      if (player1Socket) {
        player1Socket.emit("match-found", {
          duelId,
          opponent: { username: player2.username, elo: player2.userElo },
          isPlayer1: true,
        })
      }

      if (player2Socket) {
        player2Socket.emit("match-found", {
          duelId,
          opponent: { username: player1.username, elo: player1.userElo },
          isPlayer1: false,
        })
      }

      console.log("🎮 Game session created, waiting for both players to join...")
    } catch (error) {
      console.error("❌ Error creating game session:", error)
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        player1: player1.username,
        player2: player2.username,
        subject
      })

      // Notify players of error
      const player1Socket = this.io.sockets.sockets.get(player1.socketId)
      const player2Socket = this.io.sockets.sockets.get(player2.socketId)

      const errorMessage = error instanceof Error ? error.message : "Failed to create game session"
      player1Socket?.emit("error", `Failed to create game session: ${errorMessage}`)
      player2Socket?.emit("error", `Failed to create game session: ${errorMessage}`)
    }
  }

  private startGame(duelId: string) {
    const session = this.activeSessions.get(duelId)
    if (!session) {
      console.log("❌ Cannot start game: session not found")
      return
    }

    // Check if both players are connected
    const player1Socket = this.io.sockets.sockets.get(session.player1.socketId)
    const player2Socket = this.io.sockets.sockets.get(session.player2.socketId)

    if (!player1Socket || !player2Socket) {
      console.log("❌ Cannot start game: not all players connected", {
        player1Connected: !!player1Socket,
        player2Connected: !!player2Socket
      })
      return
    }

    console.log("🚀 Starting game:", duelId)
    console.log("📝 Quiz questions available:", session.quizData.length)

    const currentQuestion = session.quizData[0]
    session.questionStartTime = Date.now()

    const gameStartData = {
      quizData: session.quizData,
      currentQuestion,
      questionIndex: 0,
      subject: session.subject,
    }

    console.log("📤 Sending game-start to both players")
    player1Socket.emit("game-start", gameStartData)
    player2Socket.emit("game-start", gameStartData)
  }

  private handleJoinGame(socket: any, data: { duelId: string; userId: string }) {
    const session = this.activeSessions.get(data.duelId)
    if (!session) {
      console.log("❌ Game session not found for duel:", data.duelId)
      socket.emit("error", "Game session not found")
      return
    }

    console.log("🎮 Player attempting to join game:", { 
      duelId: data.duelId, 
      userId: data.userId,
      sessionExists: !!session 
    })

    // Update socket mapping in case of reconnection
    if (session.player1.userId === data.userId) {
      session.player1.socketId = socket.id
      this.playerSessions.set(socket.id, data.duelId)
      console.log("🎮 Player1 joined game:", data.duelId)
    } else if (session.player2.userId === data.userId) {
      session.player2.socketId = socket.id
      this.playerSessions.set(socket.id, data.duelId)
      console.log("🎮 Player2 joined game:", data.duelId)
    } else {
      console.log("❌ User not part of this game session:", { 
        userId: data.userId, 
        player1: session.player1.userId, 
        player2: session.player2.userId 
      })
      socket.emit("error", "You are not part of this game session")
      return
    }

    // Check if game should start (both players joined)
    const bothPlayersJoined = this.playerSessions.has(session.player1.socketId) && 
                              this.playerSessions.has(session.player2.socketId)
    
    if (bothPlayersJoined) {
      console.log("👥 Both players joined, sending game start")
      this.startGame(data.duelId)
    }
  }

  private async handlePlayerAnswer(socket: any, data: { answer: string; timeElapsed: number }) {
    const duelId = this.playerSessions.get(socket.id)
    if (!duelId) {
      socket.emit("error", "No active game session")
      return
    }

    const session = this.activeSessions.get(duelId)
    if (!session) {
      socket.emit("error", "Game session not found")
      return
    }

    const isPlayer1 = session.player1.socketId === socket.id
    const currentQuestionIndex = session.currentQuestionIndex

    console.log(`📝 Player answer received: ${isPlayer1 ? "Player1" : "Player2"} - ${data.answer}`)

    // Store answer
    if (isPlayer1) {
      session.player1Answers[currentQuestionIndex] = data.answer
      session.player1Times[currentQuestionIndex] = data.timeElapsed
    } else {
      session.player2Answers[currentQuestionIndex] = data.answer
      session.player2Times[currentQuestionIndex] = data.timeElapsed
    }

    // Notify opponent that player answered
    const opponentSocket = isPlayer1
      ? this.io.sockets.sockets.get(session.player2.socketId)
      : this.io.sockets.sockets.get(session.player1.socketId)

    opponentSocket?.emit("opponent-answered")

    // Check if both players have answered
    const bothAnswered =
      session.player1Answers[currentQuestionIndex] !== undefined &&
      session.player2Answers[currentQuestionIndex] !== undefined

    if (bothAnswered) {
      await this.processQuestionResult(session)
    }
  }

  private async processQuestionResult(session: GameSession) {
    const currentQuestion = session.quizData[session.currentQuestionIndex]
    const correctAnswer = currentQuestion.correct_answer

    const player1Answer = Number.parseInt(session.player1Answers[session.currentQuestionIndex])
    const player2Answer = Number.parseInt(session.player2Answers[session.currentQuestionIndex])

    const player1Correct = player1Answer === correctAnswer
    const player2Correct = player2Answer === correctAnswer

    // Update scores
    if (player1Correct) session.player1Score++
    if (player2Correct) session.player2Score++

    console.log(`📊 Question ${session.currentQuestionIndex + 1} results:`)
    console.log(`   Player1: ${player1Correct ? "✅" : "❌"} (${player1Answer})`)
    console.log(`   Player2: ${player2Correct ? "✅" : "❌"} (${player2Answer})`)
    console.log(`   Scores: ${session.player1Score} - ${session.player2Score}`)

    // Send results to players
    const player1Socket = this.io.sockets.sockets.get(session.player1.socketId)
    const player2Socket = this.io.sockets.sockets.get(session.player2.socketId)

    player1Socket?.emit("question-result", {
      correct: player1Correct,
      opponentCorrect: player2Correct,
      explanation: currentQuestion.explanation,
      scores: { player: session.player1Score, opponent: session.player2Score },
    })

    player2Socket?.emit("question-result", {
      correct: player2Correct,
      opponentCorrect: player1Correct,
      explanation: currentQuestion.explanation,
      scores: { player: session.player2Score, opponent: session.player1Score },
    })

    // Check if game should continue
    if (session.currentQuestionIndex + 1 < session.quizData.length) {
      // Move to next question
      setTimeout(() => {
        this.nextQuestion(session)
      }, 3000) // 3 second delay to show results
    } else {
      // End game
      setTimeout(() => {
        this.endGame(session)
      }, 3000)
    }
  }

  private nextQuestion(session: GameSession) {
    session.currentQuestionIndex++
    session.questionStartTime = Date.now()

    const currentQuestion = session.quizData[session.currentQuestionIndex]

    const player1Socket = this.io.sockets.sockets.get(session.player1.socketId)
    const player2Socket = this.io.sockets.sockets.get(session.player2.socketId)

    const nextQuestionData = {
      question: currentQuestion,
      questionIndex: session.currentQuestionIndex,
    }

    player1Socket?.emit("next-question", nextQuestionData)
    player2Socket?.emit("next-question", nextQuestionData)

    console.log(`➡️ Moving to question ${session.currentQuestionIndex + 1}`)
  }

  private async endGame(session: GameSession) {
    console.log("🏁 Game ending:", session.duelId)

    let winnerId = null
    if (session.player1Score > session.player2Score) {
      winnerId = session.player1.userId
    } else if (session.player2Score > session.player1Score) {
      winnerId = session.player2.userId
    }

    // Calculate ELO changes
    let eloChanges = null
    try {
      const player1 = await getUserById(session.player1.userId)
      const player2 = await getUserById(session.player2.userId)

      if (player1 && player2) {
        const player1CurrentElo = getUserEloForSubject(player1.elo, session.subject as any)
        const player2CurrentElo = getUserEloForSubject(player2.elo, session.subject as any)

        let player1Result = 0.5 // draw
        let player2Result = 0.5 // draw

        if (winnerId === session.player1.userId) {
          player1Result = 1 // win
          player2Result = 0 // loss
        } else if (winnerId === session.player2.userId) {
          player1Result = 0 // loss
          player2Result = 1 // win
        }

        const newPlayer1Elo = calculateEloRating(player1CurrentElo, player2CurrentElo, player1Result)
        const newPlayer2Elo = calculateEloRating(player2CurrentElo, player1CurrentElo, player2Result)

        await updateUsersElo(
          session.player1.userId,
          session.player2.userId,
          session.subject as any,
          newPlayer1Elo,
          newPlayer2Elo,
        )

        eloChanges = {
          player1: {
            oldElo: player1CurrentElo,
            newElo: newPlayer1Elo,
            change: newPlayer1Elo - player1CurrentElo,
          },
          player2: {
            oldElo: player2CurrentElo,
            newElo: newPlayer2Elo,
            change: newPlayer2Elo - player2CurrentElo,
          },
        }
      }
    } catch (error) {
      console.error("❌ Error calculating ELO:", error)
    }

    // Update Firebase
    try {
        if(!winnerId) throw new Error("Error no winner")

      await updateDuel(session.duelId, {
        winnerId,
        player1Score: session.player1Score,
        player2Score: session.player2Score,
        status: "completed",
        completedAt: new Date(),
      })
    } catch (error) {
      console.error("❌ Error updating duel in Firebase:", error)
    }

    // Send game end to players
    const player1Socket = this.io.sockets.sockets.get(session.player1.socketId)
    const player2Socket = this.io.sockets.sockets.get(session.player2.socketId)

    player1Socket?.emit("game-end", {
      winner: winnerId,
      finalScores: { player: session.player1Score, opponent: session.player2Score },
      eloChanges: eloChanges
        ? {
            player: eloChanges.player1,
            opponent: eloChanges.player2,
          }
        : null,
    })

    player2Socket?.emit("game-end", {
      winner: winnerId,
      finalScores: { player: session.player2Score, opponent: session.player1Score },
      eloChanges: eloChanges
        ? {
            player: eloChanges.player2,
            opponent: eloChanges.player1,
          }
        : null,
    })

    // Cleanup
    this.activeSessions.delete(session.duelId)
    this.playerSessions.delete(session.player1.socketId)
    this.playerSessions.delete(session.player2.socketId)

    console.log("✅ Game ended and cleaned up")
  }

  private handleDisconnect(socket: any) {
    // Remove from queues
    this.handleLeaveQueue(socket)

    // Handle active game disconnection
    const duelId = this.playerSessions.get(socket.id)
    if (duelId) {
      const session = this.activeSessions.get(duelId)
      if (session) {
        // Notify opponent of disconnection
        const isPlayer1 = session.player1.socketId === socket.id
        const opponentSocket = isPlayer1
          ? this.io.sockets.sockets.get(session.player2.socketId)
          : this.io.sockets.sockets.get(session.player1.socketId)

        opponentSocket?.emit("error", "Opponent disconnected")

        // Could implement reconnection logic here
        console.log("🔌 Player disconnected from active game:", duelId)
      }
    }

    this.playerSessions.delete(socket.id)
  }
}

// Create HTTP server and Socket.io server
const httpServer = createServer()
const gameServer = new SocketGameServer(httpServer)

const PORT = process.env.SOCKET_PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket server running on port ${PORT}`)
})

export { gameServer }
