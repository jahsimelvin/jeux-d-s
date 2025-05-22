function isAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') {
    return next();
  }
  res.status(403).send('⛔ Accès interdit');
}

module.exports = isAdmin;