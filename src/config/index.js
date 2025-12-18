require('./env');

const path = require('path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const ROOT = path.join(__dirname, '..', '..');
const FIRMWARE_DIR = path.join(ROOT, 'firmware');
const FIRMWARE_FILE = process.env.FIRMWARE_FILE || 'firmware.bin';

const SUPPORTED_DEVICES = (process.env.DEVICES || 'gds007,gds-hyd,gds-eco')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const LOG_DIR = path.join(ROOT, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ota.log');

function parseApiKeys(raw) {
  if (!raw) {
    return [];
  }
  return String(raw)
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

function parseDeviceMacs(raw) {
  if (!raw) {
    return {};
  }

  const text = String(raw).trim();
  if (!text) {
    return {};
  }

  if (text.startsWith('{')) {
    try {
      const obj = JSON.parse(text);
      const mapped = {};
      Object.keys(obj || {}).forEach((key) => {
        const device = String(key).trim().toLowerCase();
        if (!device) {
          return;
        }
        const list = Array.isArray(obj[key]) ? obj[key] : String(obj[key]).split(/[|,]/);
        mapped[device] = list
          .map((mac) => String(mac).trim().toLowerCase())
          .filter(Boolean);
      });
      return mapped;
    } catch (_err) {
      return {};
    }
  }

  // Format: "gds007=aa:bb:cc:dd:ee:ff|11:22:33:44:55:66,gds-eco=..."
  return text.split(',').reduce((acc, entry) => {
    const [left, ...rest] = String(entry).split('=');
    const device = String(left || '').trim().toLowerCase();
    const value = rest.join('=').trim();
    if (!device || !value) {
      return acc;
    }
    acc[device] = value
      .split('|')
      .map((mac) => String(mac).trim().toLowerCase())
      .filter(Boolean);
    return acc;
  }, {});
}

const API_KEYS = parseApiKeys(process.env.API_KEYS || '');
const DEVICE_MACS = parseDeviceMacs(process.env.DEVICE_MACS || '');
const DEVICE_MACS_FILE = process.env.DEVICE_MACS_FILE || path.join(ROOT, 'config', 'device_macs.json');

module.exports = {
  HOST,
  PORT,
  FIRMWARE_DIR,
  FIRMWARE_FILE,
  SUPPORTED_DEVICES,
  LOG_DIR,
  LOG_FILE,
  API_KEYS,
  DEVICE_MACS,
  DEVICE_MACS_FILE,
};
