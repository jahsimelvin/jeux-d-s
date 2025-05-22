// server.js
const express = require('express')
const http = require('http')
const path = require('path')
const os = require('os')
const session = require('express-session')
const bcrypt = require('bcrypt')
const mysql = require('mysql2/promise')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

// Connexion à la BDD
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'jeu_de_des'
})

// Middlewares généraux
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}))

// Authentification
function isAuthenticated(req, res, next) {
  if (req.session.user) return next()
  res.redirect('/login.html')
}
function isAdmin(req, res, next) {
  if (req.session.user?.role === 'admin') return next()
  res.status(403).send('⛔ Accès interdit')
}

// Routes publiques HTML (connexion / inscription)
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')))
app.get('/register.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')))
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))
app.get('/', (req, res) => {res.redirect('/index.html')})

// Assets (CSS, JS, images) __UNIQUEMENT__ sous /static
app.use('/static', express.static(path.join(__dirname, 'public')))

// Sécurisation des pages protégées
app.get('/home.html',      isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')))
app.get('/profile.html',   isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')))
app.get('/history.html',   isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'history.html')))
app.get('/leaderboard.html',isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'leaderboard.html')))
app.get('/rules.html',     isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'rules.html')))
app.get('/admin.html',     isAdmin,         (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')))

// Auth : inscription
app.post('/register', async (req, res) => {
  const { name, username, password, sex, location } = req.body
  const hash = await bcrypt.hash(password, 10)
  try {
    await db.query(
      'INSERT INTO users (name, username, password, sex, location) VALUES (?, ?, ?, ?, ?)',
      [name, username, hash, sex, location]
    )
    res.redirect('/login.html')
  } catch {
    res.send('Nom d’utilisateur déjà utilisé.')
  }
})

// Auth : connexion
app.post('/login', async (req, res) => {
  const { username, password } = req.body
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username])
  if (!rows.length || !await bcrypt.compare(password, rows[0].password)) {
    return res.send('Identifiants incorrects.')
  }
  const user = rows[0]
  req.session.user = { id: user.id, username: user.username, role: user.role }
  if (user.role === 'admin') return res.redirect('/admin.html')
  res.redirect('/home.html')
})

// Déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'))
})

// API : leaderboard
app.get('/api/leaderboard', isAuthenticated, async (req, res) => {
  const [rows] = await db.query(`
    SELECT u.username, s.total_wins, s.total_losses, s.total_draws
    FROM scores s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.total_wins DESC
  `)
  res.json(rows)
})

// API : règles
app.get('/api/rules', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT content FROM rules WHERE id = 1')
    res.send(rows[0]?.content || '')
  } catch (err) {
    console.error('Erreur /api/rules :', err)
    res.status(500).send('Erreur de lecture des règles.')
  }
})
app.post('/admin/rules', isAdmin, async (req, res) => {
  const { content } = req.body
  await db.query('UPDATE rules SET content = ? WHERE id = 1', [content])
  res.sendStatus(200)
})

// API : historique de jeu
app.get('/api/history', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id
  const [rows] = await db.query(`
    SELECT g.date_played,
           u.username AS opponent,
           CASE WHEN g.player1_id = ? THEN g.player1_wins ELSE g.player2_wins END AS wins,
           CASE WHEN g.player1_id = ? THEN g.player2_wins ELSE g.player1_wins END AS losses,
           g.draws
    FROM games g
    JOIN users u ON u.id = CASE WHEN g.player1_id = ? THEN g.player2_id ELSE g.player1_id END
    WHERE g.player1_id = ? OR g.player2_id = ?
    ORDER BY g.date_played DESC
  `, [userId,userId,userId,userId,userId])
  res.json(rows)
})

// Socket.io : matchmaking & parties
let waitingPlayer = null
let gamesData = {}

io.on('connection', socket => {
  const userId = socket.handshake.query.userId
  if (waitingPlayer) {
    // démarrage partie
    const room = `${waitingPlayer.id}-${socket.id}`
    gamesData[room] = {
      players: [waitingPlayer, socket],
      rounds: 0,
      scores: { [waitingPlayer.id]: 0, [socket.id]: 0 },
      userIds: [waitingPlayer.userId, userId]
    }
    waitingPlayer.join(room)
    socket.join(room)
    io.to(room).emit('gameStart', { roomId: room })
    waitingPlayer = null
  } else {
    socket.userId = userId
    waitingPlayer = socket
    socket.emit('waiting', 'En attente d’un autre joueur...')
  }

  socket.on('rollDice', ({ roomId }) => {
    const roll = Math.floor(Math.random()*6)+1
    socket.emit('yourRoll', { result: roll })
    socket.to(roomId).emit('opponentRoll', { result: roll })
    const game = gamesData[roomId]
    if (!game) return
    game.scores[socket.id] += roll
    game.rounds++
    if (game.rounds >= 10) {
      const [p1, p2] = game.players
      const [id1, id2] = game.userIds
      const s1 = game.scores[p1.id], s2 = game.scores[p2.id]
      let w1=0,w2=0,d=0
      if (s1>s2) w1=1
      else if (s2>s1) w2=1
      else d=1
      // enregistrer partie + scores
      db.query(
        'INSERT INTO games (player1_id,player2_id,player1_wins,player2_wins,draws) VALUES (?,?,?,?,?)',
        [id1,id2,w1,w2,d]
      )
      updateScore(id1,w1,w2,d)
      updateScore(id2,w2,w1,d)
      delete gamesData[roomId]
    }
  })

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.id===socket.id) waitingPlayer = null
  })
})

// Mise à jour des scores cumulés
async function updateScore(userId, w,l,d) {
  const [rows] = await db.query('SELECT * FROM scores WHERE user_id = ?', [userId])
  if (rows.length) {
    await db.query(
      'UPDATE scores SET total_wins=total_wins+?, total_losses=total_losses+?, total_draws=total_draws+? WHERE user_id=?',
      [w,l,d,userId]
    )
  } else {
    await db.query(
      'INSERT INTO scores (user_id,total_wins,total_losses,total_draws) VALUES (?,?,?,?)',
      [userId,w,l,d]
    )
  }
}

// Démarrage du serveur sur toutes interfaces
function getClientIP() {
  const ifaces = os.networkInterfaces()
  for (let name of Object.keys(ifaces)) {
    for (let net of ifaces[name]) {
      if (net.family==='IPv4' && !net.internal) return net.address
    }
  }
  return 'localhost'
}

server.listen(3000, '0.0.0.0', () => {
  console.log(`✅ Serveur lancé sur http://localhost:3000`)
  console.log(`✅ Client accessible via http://${getClientIP()}:3000`)
})
