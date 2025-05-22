const express = require('express');
const bcrypt  = require('bcrypt');
const db      = require('../db');

const router = express.Router();

// POST /register
router.post('/register', async (req, res) => {
  const { name, username, password, sex, location } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    await db.query(
      'INSERT INTO users (name, username, password, sex, location) VALUES (?, ?, ?, ?, ?)',
      [name, username, hash, sex, location]
    );
    res.redirect('/login.html');
  } catch (err) {
    console.error('Register error:', err);
    res.send('Nom d’utilisateur déjà utilisé.');
  }
});

// POST /login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) {
      return res.send('Utilisateur non trouvé.');
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.send('Mot de passe incorrect.');
    }
    req.session.user = { id: user.id, username: user.username, role: user.role };
    // Redirection selon rôle
    if (user.role === 'admin') {
      return res.redirect('/admin.html');
    }
    res.redirect('/home.html');
  } catch (err) {
    console.error('Login error:', err);
    res.send('Erreur lors de la connexion.');
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

module.exports = router;
