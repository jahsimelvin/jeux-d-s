// server.js
const express  = require('express')
const http     = require('http')
const path     = require('path')
const os       = require('os')
const session  = require('express-session')
const { Server } = require('socket.io')

// Import des modules
const db                = require('./db')
const isAuthenticated   = require('./middleware/auth')
const isAdmin           = require('./middleware/roles')
const pagesRouter       = require('./routes/pages')
const authRouter        = require('./routes/auth')
const rulesApiRouter    = require('./routes/api-rules')
const historyApiRouter  = require('./routes/api-history')
const boardApiRouter    = require('./routes/api-leaderboard')
const socketHandler     = require('./socket')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server)

// Middlewares
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}))

// Routes HTML & API
app.use(pagesRouter)
app.use(authRouter)
app.use(rulesApiRouter)
app.use(historyApiRouter)
app.use(boardApiRouter)

// Assets publics sous /static
app.use('/static', express.static(path.join(__dirname, 'public')))

// Socket.IO (matchmaking et parties)
socketHandler(io)

// Fonction pour détecter l’IP locale de la machine
function getClientIP() {
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}

// Démarrage du serveur et de la l'interfaces client
const PORT = 3000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`)
  console.log(`✅ Client accessible via http://${getClientIP()}:${PORT}`)
})
