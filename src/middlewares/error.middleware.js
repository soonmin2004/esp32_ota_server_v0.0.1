module.exports = function errorMiddleware(err, _req, res, _next) {
  if (!err) {
    res.status(500).json({ error: 'unknown_error' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
};

