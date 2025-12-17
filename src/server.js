const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

const { HOST, PORT, FIRMWARE_DIR, LOG_DIR, FIRMWARE_FILE, SUPPORTED_DEVICES } = require('./config');
const { createRouter } = require('./routes');
const { createWebSocketServer } = require('./lib/ws');
const { createWatcher } = require('./lib/watcher');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Ensure required directories exist.
[FIRMWARE_DIR, LOG_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Simple request logging.
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes.
app.use(createRouter());

// Server and WebSocket.
const server = http.createServer(app);
const { broadcast } = createWebSocketServer(server);

// Watch firmware changes and broadcast.
createWatcher((deviceId) => {
  broadcast(deviceId);
});

server.listen(PORT, HOST, () => {
  console.log(`ESP32 OTA server listening on http://${HOST}:${PORT}`);
  console.log(`Firmware file: ${path.join(FIRMWARE_DIR, FIRMWARE_FILE)}`);
  if (SUPPORTED_DEVICES.length) {
    console.log(`Supported devices: ${SUPPORTED_DEVICES.join(', ')}`);
  }
});
