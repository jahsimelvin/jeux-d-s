let userId = sessionStorage.getItem('userId')
const socket = io({ query: { userId } })

const status = document.getElementById('status')
const rollBtn = document.getElementById('rollBtn')
const results = document.getElementById('results')
const scoreBoard = document.getElementById('scoreBoard')

let currentRoom = null
let myScore = 0
let opponentScore = 0
let myRolls = 0
let opponentRolls = 0
let gameEnded = false

socket.on('waiting', (msg) => {
  status.textContent = msg
})

socket.on('gameStart', ({ roomId }) => {
  currentRoom = roomId
  status.textContent = '🎮 Partie trouvée ! Vous pouvez jouer.'
  rollBtn.disabled = false
  myScore = 0
  opponentScore = 0
  myRolls = 0
  opponentRolls = 0
  gameEnded = false
  results.innerHTML = ''
  scoreBoard.innerHTML = ''
})

rollBtn.addEventListener('click', () => {
  if (!gameEnded && myRolls < 5) {
    socket.emit('rollDice', { roomId: currentRoom })
    rollBtn.disabled = true
  }
})

socket.on('yourRoll', ({ result }) => {
  results.innerHTML = `<p>🎲 Vous avez lancé : ${result}</p>`
  myScore += result
  myRolls++
  updateScore()
})

socket.on('opponentRoll', ({ result }) => {
  results.innerHTML += `<p>🤖 Adversaire a lancé : ${result}</p>`
  opponentScore += result
  opponentRolls++
  if (!gameEnded && myRolls < 5) {
    rollBtn.disabled = false
  }
  updateScore()
})

function updateScore() {
  scoreBoard.innerHTML = `Manches : ${myRolls}/5<br>Vous : ${myScore} | Adversaire : ${opponentScore}`
  if (myRolls >= 5 && opponentRolls >= 5 && !gameEnded) {
    gameEnded = true
    rollBtn.disabled = true
    const res = myScore > opponentScore
    ? "✅ Vous avez gagné !!! Vous avez obtenu plus de points."
    : myScore < opponentScore
    ? "❌ Vous avez perdu. :( Vous n'avez pas obtenu assez de points."
    : "🤝 Égalité. Retentez votre chance !"
    status.textContent = `Fin de partie. ${res}`
  }
}
