const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { config } = require('dotenv')

// Load environment variables
config({ path: '.env.local' })

// Import your existing socket game server logic
// Note: You'll need to modify socket-server.ts to export the SocketGameServer class
const { SocketGameServer } = require('./socket-server-integrated')

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
        ? ["https://your-app.railway.app"] // Replace with your Railway domain
        : ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"]
    }
  })

  // Initialize your game server with the existing logic
  new SocketGameServer(io)

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`🚀 Next.js app ready on http://${hostname}:${port}`)
    console.log(`🎮 Socket.io server running on the same port`)
  })
})
