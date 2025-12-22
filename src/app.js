const express = require('express');

const routes = require('./routes');
const requestLogger = require('./middlewares/request.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

function createApp() {
  // Express app wiring: JSON parsing, request logging, routes, error handler.
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.use(routes);

  app.use(errorMiddleware);
  return app;
}

module.exports = createApp;
