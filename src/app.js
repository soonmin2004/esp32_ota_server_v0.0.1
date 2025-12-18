const express = require('express');

const routes = require('./routes');
const requestLogger = require('./middlewares/request.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.use(routes);

  app.use(errorMiddleware);
  return app;
}

module.exports = createApp;

