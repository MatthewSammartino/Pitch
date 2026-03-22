// Middleware: require an authenticated session (set by Passport / express-session)
function authenticate(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

module.exports = authenticate;
