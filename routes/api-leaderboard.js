const express = require('express');
const db      = require('../db');
const isAuth  = require('../middleware/auth');

const router = express.Router();

router.get('/api/leaderboard', isAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.username, s.total_wins, s.total_losses, s.total_draws
      FROM scores s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.total_wins DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('API /api/leaderboard error:', err);
    res.status(500).send('Erreur de lecture du classement.');
  }
});

module.exports = router;
