const db = require('./db');

module.exports = (io) => {
  let waitingPlayer = null;
  const gamesData = {};

  io.on('connection', (socket) => {
    // Récupère l'ID utilisateur
    const userId = socket.handshake.query.userId;

    if (waitingPlayer) {
      // Démarrage d’une partie à deux
      const roomId = `${waitingPlayer.id}-${socket.id}`;
      gamesData[roomId] = {
        players:      [waitingPlayer, socket],
        rounds:       0,
        scores:       { [waitingPlayer.id]: 0, [socket.id]: 0 },
        userIds:      [waitingPlayer.userId, userId]
      };

      waitingPlayer.join(roomId);
      socket.join(roomId);
      io.to(roomId).emit('gameStart', { roomId });
      waitingPlayer = null;

    } else {
      // Premier joueur en attente
      socket.userId = userId;
      waitingPlayer = socket;
      socket.emit('waiting', 'En attente d’un autre joueur...');
    }

    socket.on('rollDice', ({ roomId }) => {
      const roll = Math.floor(Math.random() * 6) + 1;
      // Envoie le résultat au lanceur et à l’adversaire
      socket.emit('yourRoll', { result: roll });
      socket.to(roomId).emit('opponentRoll', { result: roll });

      const game = gamesData[roomId];
      if (!game) return;

      game.scores[socket.id] += roll;
      game.rounds++;

      // Après 10 lancers (5 manches par joueur)
      if (game.rounds >= 10) {
        const [p1, p2] = game.players;
        const [id1, id2] = game.userIds;
        const s1 = game.scores[p1.id];
        const s2 = game.scores[p2.id];

        let w1 = 0, w2 = 0, d = 0;
        if (s1 > s2)      w1 = 1;
        else if (s2 > s1) w2 = 1;
        else              d  = 1;

        // Enregistre la partie
        db.query(
          `INSERT INTO games (player1_id, player2_id, player1_wins, player2_wins, draws)
           VALUES (?, ?, ?, ?, ?)`,
          [id1, id2, w1, w2, d]
        );

        // Met à jour les scores cumulés
        updateScore(id1, w1, w2, d);
        updateScore(id2, w2, w1, d);

        // Nettoie la partie
        delete gamesData[roomId];
      }
    });

    socket.on('disconnect', () => {
      // Si le joueur en attente se déconnecte
      if (waitingPlayer && waitingPlayer.id === socket.id) {
        waitingPlayer = null;
      }
    });
  });
};

// Fonction interne pour mettre à jour la table scores
async function updateScore(userId, w, l, d) {
  const [rows] = await db.query('SELECT * FROM scores WHERE user_id = ?', [userId]);
  if (rows.length) {
    await db.query(
      `UPDATE scores
       SET total_wins   = total_wins   + ?,
           total_losses = total_losses + ?,
           total_draws  = total_draws  + ?
       WHERE user_id = ?`,
      [w, l, d, userId]
    );
  } else {
    await db.query(
      `INSERT INTO scores (user_id, total_wins, total_losses, total_draws)
       VALUES (?, ?, ?, ?)`,
      [userId, w, l, d]
    );
  }
}
