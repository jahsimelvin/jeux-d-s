function isAuthenticated(req, res, next) {
  if (req.session?.user) {
    return next();
  }
  res.redirect('/login.html');
}

module.exports = isAuthenticated;