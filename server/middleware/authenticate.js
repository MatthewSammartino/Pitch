// Middleware: require an authenticated session (Passport or guest)
function authenticate(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  if (req.session?.guestUser) {
    req.user = req.session.guestUser;
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

module.exports = authenticate;
