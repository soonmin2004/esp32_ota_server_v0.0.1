const fs = require('fs');
const path = require('path');
const http = require('http');

const createApp = require('./app');
const { HOST, PORT, FIRMWARE_DIR, LOG_DIR, FIRMWARE_FILE, SUPPORTED_DEVICES } = require('./config');
const { createWebSocketServer } = require('./services/ws.service');
const { createWatcher } = require('./services/watcher.service');
const { startDeviceMacsWatcher } = require('./services/deviceRegistry.service');

// Bootstraps Express + WebSocket OTA server, ensures required dirs, and broadcasts on firmware changes.

// Ensure required directories exist.
[FIRMWARE_DIR, LOG_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const app = createApp();

// Server and WebSocket.
const server = http.createServer(app);
const { broadcast } = createWebSocketServer(server);

// Watch firmware changes and broadcast.
createWatcher((deviceId) => {
  broadcast(deviceId);
});

// Watch device MAC allowlist file changes (if configured).
startDeviceMacsWatcher();

server.listen(PORT, HOST, () => {
  console.log(`ESP32 OTA server listening on http://${HOST}:${PORT}`);
  console.log(`Firmware file: ${path.join(FIRMWARE_DIR, FIRMWARE_FILE)}`);
  if (SUPPORTED_DEVICES.length) {
    console.log(`Supported devices: ${SUPPORTED_DEVICES.join(', ')}`);
  }
});
