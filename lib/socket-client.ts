import { io, type Socket } from "socket.io-client"

export interface SocketEvents {
  // Matchmaking events
  "join-queue": (data: { userId: string; subject: string; userElo: number; username: string }) => void
  "leave-queue": () => void
  "match-found": (data: { duelId: string; opponent: any; isPlayer1: boolean }) => void
  "queue-status": (data: { position: number; playersInQueue: number }) => void

  // Game events
  "join-game": (duelId: string) => void
  "game-start": (data: { quizData: any[]; currentQuestion: any }) => void
  "player-answer": (data: { answer: string; timeElapsed: number }) => void
  "opponent-answered": () => void
  "question-result": (data: {
    correct: boolean
    opponentCorrect: boolean
    explanation: string
    scores: { player: number; opponent: number }
  }) => void
  "next-question": (data: { question: any; questionIndex: number }) => void
  "game-end": (data: {
    winner: string | null
    finalScores: { player: number; opponent: number }
    eloChanges?: any
  }) => void

  // Connection events
  connect: () => void
  disconnect: () => void
  error: (error: string) => void
}

class SocketClient {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(process.env.NODE_ENV === "production" ? "" : "http://localhost:3000", {
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    })

    this.socket.on("connect", () => {
      console.log("🔌 Socket connected:", this.socket?.id)
      this.reconnectAttempts = 0
    })

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason)
    })

    this.socket.on("connect_error", (error) => {
      console.error("🔌 Socket connection error:", error)
      this.handleReconnect()
    })

    return this.socket
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => {
        this.socket?.connect()
      }, 1000 * this.reconnectAttempts)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>) {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args)
    } else {
      console.warn("🔌 Socket not connected, cannot emit:", event)
    }
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    if (this.socket) {
      this.socket.on(event as string, callback)
    }
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]) {
    if (this.socket) {
      this.socket.off(event as string, callback)
    }
  }
}

export const socketClient = new SocketClient()
