const express = require('express');
const path    = require('path');
const isAuth  = require('../middleware/auth');
const isAdmin = require('../middleware/roles');

const router = express.Router();

router.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Pages publiques
router.get('/index.html',    (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
router.get('/login.html',    (req, res) => res.sendFile(path.join(__dirname, '../public/login.html')));
router.get('/register.html', (req, res) => res.sendFile(path.join(__dirname, '../public/register.html')));

// Pages USER
router.get('/home.html',       isAuth, (req, res) => res.sendFile(path.join(__dirname, '../public/home.html')));
router.get('/profile.html',    isAuth, (req, res) => res.sendFile(path.join(__dirname, '../public/profile.html')));
router.get('/history.html',    isAuth, (req, res) => res.sendFile(path.join(__dirname, '../public/history.html')));
router.get('/leaderboard.html',isAuth, (req, res) => res.sendFile(path.join(__dirname, '../public/leaderboard.html')));
router.get('/rules.html',      isAuth, (req, res) => res.sendFile(path.join(__dirname, '../public/rules.html')));

// Page Admin
router.get('/admin.html', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

module.exports = router;
