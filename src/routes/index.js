const express = require('express');
const { createRouter: createOtaRouter } = require('./ota.routes');

const router = express.Router();

router.use(createOtaRouter());

module.exports = router;
