const express = require('express');
const db      = require('../db');
const isAdmin = require('../middleware/roles');

const router = express.Router();

router.get('/api/rules', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT content FROM rules WHERE id = 1');
    res.send(rows[0]?.content || '');
  } catch (err) {
    console.error('API /api/rules error:', err);
    res.status(500).send('Erreur de lecture des règles.');
  }
});

router.post('/admin/rules', isAdmin, async (req, res) => {
  try {
    const { content } = req.body;
    await db.query('UPDATE rules SET content = ? WHERE id = 1', [content]);
    res.sendStatus(200);
  } catch (err) {
    console.error('API POST /admin/rules error:', err);
    res.status(500).send('Erreur lors de la mise à jour des règles.');
  }
});

module.exports = router;
