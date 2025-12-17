// Load environment from .env if present.
try {
  require('dotenv').config();
} catch (_err) {
  // dotenv optional; ignore if not installed.
}

const path = require('path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, '..');
const FIRMWARE_DIR = path.join(ROOT, 'firmware');
const FIRMWARE_FILE = process.env.FIRMWARE_FILE || 'firmware.bin';
const SUPPORTED_DEVICES = (process.env.DEVICES || 'gds007,gds-hyd,gds-eco')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);
const LOG_DIR = path.join(ROOT, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ota.log');

module.exports = {
  HOST,
  PORT,
  FIRMWARE_DIR,
  FIRMWARE_FILE,
  SUPPORTED_DEVICES,
  LOG_DIR,
  LOG_FILE,
};
