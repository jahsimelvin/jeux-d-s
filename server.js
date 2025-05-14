const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const session = require('express-session')
const bcrypt = require('bcrypt')
const mysql = require('mysql2/promise')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }))

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'jeu_de_des'
})

function isAuthenticated(req, res, next) {
  if (req.session.user) return next()
  res.redirect('/login.html')
}

function isAdmin(req, res, next) {
    if (req.session.user?.role === 'admin') return next()
    res.status(403).send('Accès interdit')
  }
 

app.post('/register', async (req, res) => {
  const { name, username, password, sex, location } = req.body
  const hash = await bcrypt.hash(password, 10)
  try {
    await db.query('INSERT INTO users (name, username, password, sex, location) VALUES (?, ?, ?, ?, ?)', [name, username, hash, sex, location])
    res.redirect('/login.html')
  } catch {
    res.send('Nom d’utilisateur déjà utilisé.')
  }
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username])
  if (rows.length && await bcrypt.compare(password, rows[0].password)) {
    req.session.user = { id: rows[0].id, username: rows[0].username, role: rows[0].role }
    res.redirect('/home.html')
  } else {
    res.send('Identifiants incorrects.')
  }
})

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/index.html'))
})


app.get('/home.html', isAuthenticated, (req, res) => res.sendFile(__dirname + '/public/home.html'))
app.get('/profile.html', isAuthenticated, (req, res) => res.sendFile(__dirname + '/public/profile.html'))
app.get('/history.html', isAuthenticated, (req, res) => res.sendFile(__dirname + '/public/history.html'))
app.get('/leaderboard.html', isAuthenticated, (req, res) => res.sendFile(__dirname + '/public/leaderboard.html'))
app.get('/rules.html', isAuthenticated, (req, res) => res.sendFile(__dirname + '/public/rules.html'))

app.get('/api/leaderboard', isAuthenticated, async (req, res) => {
  const [rows] = await db.query(`
    SELECT users.username, scores.total_wins, scores.total_losses, scores.total_draws
    FROM scores
    JOIN users ON users.id = scores.user_id
    ORDER BY scores.total_wins DESC
  `)
  res.json(rows)
})

let waitingPlayer = null
let games = {}

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId
  if (waitingPlayer) {
    const roomId = `${waitingPlayer.id}-${socket.id}`
    games[roomId] = {
      players: [waitingPlayer, socket],
      scores: { [waitingPlayer.id]: 0, [socket.id]: 0 },
      rounds: 0,
      userIds: [waitingPlayer.userId, userId]
    }
    waitingPlayer.join(roomId)
    socket.join(roomId)
    io.to(roomId).emit('gameStart', { roomId })
    waitingPlayer = null
  } else {
    socket.userId = userId
    waitingPlayer = socket
    socket.emit('waiting', 'En attente d’un autre joueur...')
  }

  socket.on('rollDice', ({ roomId }) => {
    const roll = Math.floor(Math.random() * 6) + 1
    socket.emit('yourRoll', { result: roll })
    socket.to(roomId).emit('opponentRoll', { result: roll })
    const game = games[roomId]
    if (!game) return
    const playerId = socket.id
    game.scores[playerId] += roll
    game.rounds++
    if (game.rounds >= 10) {
      const [id1, id2] = game.userIds
      const [score1, score2] = [game.scores[game.players[0].id], game.scores[game.players[1].id]]
      let w1 = 0, w2 = 0, d = 0
      if (score1 > score2) w1 = 1
      else if (score2 > score1) w2 = 1
      else d = 1
      db.query('INSERT INTO games (player1_id, player2_id, player1_wins, player2_wins, draws) VALUES (?, ?, ?, ?, ?)', [id1, id2, w1, w2, d])
      updateScore(id1, w1, w2, d)
      updateScore(id2, w2, w1, d)
      delete games[roomId]
    }
  })

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null
    }
  })
})

async function updateScore(userId, w, l, d) {
  const [rows] = await db.query('SELECT * FROM scores WHERE user_id = ?', [userId])
  if (rows.length) {
    await db.query('UPDATE scores SET total_wins = total_wins + ?, total_losses = total_losses + ?, total_draws = total_draws + ? WHERE user_id = ?', [w, l, d, userId])
  } else {
    await db.query('INSERT INTO scores (user_id, total_wins, total_losses, total_draws) VALUES (?, ?, ?, ?)', [userId, w, l, d])
  }
}

server.listen(3000, '192.168.80.1', () => {
  console.log('✅ Serveur lancé sur http://192.168.80.1:3000')
})
