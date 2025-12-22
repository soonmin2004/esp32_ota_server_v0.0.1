module.exports = function requestLogger(req, _res, next) {
  // Minimal request logger; replace with structured logging in production.
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};
