const express = require('express');
const db      = require('../db');
const isAuth  = require('../middleware/auth');

const router = express.Router();

router.get('/api/history', isAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [rows] = await db.query(`
      SELECT 
        g.date_played,
        u.username AS opponent,
        CASE WHEN g.player1_id = ? THEN g.player1_wins ELSE g.player2_wins END AS wins,
        CASE WHEN g.player1_id = ? THEN g.player2_wins ELSE g.player1_wins END AS losses,
        g.draws
      FROM games g
      JOIN users u ON u.id = CASE WHEN g.player1_id = ? THEN g.player2_id ELSE g.player1_id END
      WHERE g.player1_id = ? OR g.player2_id = ?
      ORDER BY g.date_played DESC
    `, [userId,userId,userId,userId,userId]);

    res.json(rows);
  } catch (err) {
    console.error('API /api/history error:', err);
    res.status(500).send('Erreur de chargement de l’historique.');
  }
});

module.exports = router;
