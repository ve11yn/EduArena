import { io, type Socket } from "socket.io-client"

export interface SocketEvents {
  // Matchmaking events
  "join-queue": (data: { userId: string; subject: string; userElo: number; username: string }) => void
  "leave-queue": () => void
  "match-found": (data: { duelId: string; opponent: any; isPlayer1: boolean }) => void
  "queue-status": (data: { position: number; playersInQueue: number }) => void

  // Game events
  "join-game": (data: { duelId: string; userId: string }) => void
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
  private maxReconnectAttempts = 10 // Increased for Railway

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    // Clean up existing socket if it exists but isn't connected
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners()
      this.socket = null
    }

    this.socket = io(
      process.env.NODE_ENV === "production" 
        ? window.location.origin // Connect to same origin in production (Railway)
        : "http://localhost:3001", 
      {
      transports: ["websocket", "polling"],
      timeout: 30000,
      forceNew: false, // Allow reusing connections
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionAttempts: 10, // More attempts for Railway
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      // Railway-specific optimizations
      ...(process.env.NODE_ENV === "production" && {
        transports: ["polling", "websocket"], // Start with polling for Railway
        pingTimeout: 60000,
        pingInterval: 25000,
      })
    })

    const connectionUrl = process.env.NODE_ENV === "production" 
      ? window.location.origin 
      : "http://localhost:3001"
    console.log("🔌 Socket connecting to:", connectionUrl)
    console.log("🔌 NODE_ENV:", process.env.NODE_ENV)
    console.log("🔌 Current URL:", window.location.origin)
    console.log("🔌 Is production:", process.env.NODE_ENV === "production")

    this.socket.on("connect", () => {
      console.log("🔌 Socket connected:", this.socket?.id)
      this.reconnectAttempts = 0
    })

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason)
      // Don't auto-reconnect on manual disconnect
      if (reason !== "io client disconnect") {
        this.handleReconnect()
      }
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
      // Only log warning for important events, not routine cleanup events
      if (event !== 'leave-queue' && event !== 'disconnect') {
        console.warn("🔌 Socket not connected, cannot emit:", event)
      }
      
      // Try to reconnect for important events
      if (event !== 'leave-queue' && event !== 'disconnect') {
        this.connect()
        // Retry emission after connection attempt
        setTimeout(() => {
          if (this.socket?.connected) {
            this.socket.emit(event, ...args)
          }
        }, 1000)
      }
    }
  }

  // Enhanced emit that waits for connection
  async emitWhenConnected<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        this.socket.emit(event, ...args)
        resolve()
        return
      }

      // Connect and wait for connection
      this.connect()
      
      const checkConnection = () => {
        if (this.socket?.connected) {
          this.socket.emit(event, ...args)
          resolve()
        } else {
          setTimeout(checkConnection, 100)
        }
      }

      // Start checking after a brief delay
      setTimeout(checkConnection, 100)
      
      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error(`Failed to connect socket for event: ${event}`))
      }, 5000)
    })
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

  // Safe method to leave queue without connection warnings
  safeLeaveQueue() {
    if (this.socket?.connected) {
      this.socket.emit('leave-queue')
    }
    // Don't log warning if not connected - this is expected during navigation/cleanup
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const socketClient = new SocketClient()
