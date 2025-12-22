module.exports = function errorMiddleware(err, _req, res, _next) {
  // Generic error handler; customize for status codes or structured errors.
  if (!err) {
    res.status(500).json({ error: 'unknown_error' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
};
