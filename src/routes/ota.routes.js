const express = require('express');
const controller = require('../controllers/ota.controller');
const deviceAuth = require('../middlewares/deviceAuth.middleware');

function createRouter() {
  const router = express.Router();

  router.get('/health', controller.health);

  router.get('/firmware/info', deviceAuth, controller.firmwareInfo);

  router.get('/firmware', deviceAuth, controller.firmware);

  router.post('/report', deviceAuth, controller.report);

  return router;
}

module.exports = {
  createRouter,
};
