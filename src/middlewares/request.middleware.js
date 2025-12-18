module.exports = function requestLogger(req, _res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

