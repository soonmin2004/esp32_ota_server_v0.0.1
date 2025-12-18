const fs = require('fs');
const chokidar = require('chokidar');

const { DEVICE_MACS, DEVICE_MACS_FILE } = require('../config');

let fileDeviceMacs = {};
let watcher = null;

function normalizeMac(raw) {
  if (!raw) {
    return null;
  }
  const value = String(raw).trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(value)) {
    return null;
  }
  return value;
}

function normalizeDeviceMacMap(raw) {
  const mapped = {};
  Object.keys(raw || {}).forEach((key) => {
    const device = String(key).trim().toLowerCase();
    if (!device) {
      return;
    }
    const list = Array.isArray(raw[key]) ? raw[key] : [raw[key]];
    const normalized = list
      .flatMap((entry) => String(entry).split(/[|,]/))
      .map(normalizeMac)
      .filter(Boolean);
    if (normalized.length > 0) {
      mapped[device] = Array.from(new Set(normalized));
    }
  });
  return mapped;
}

function mergeDeviceMacMaps(a, b) {
  const merged = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  keys.forEach((key) => {
    const listA = (a && a[key]) || [];
    const listB = (b && b[key]) || [];
    const combined = Array.from(new Set([...listA, ...listB]));
    if (combined.length > 0) {
      merged[key] = combined;
    }
  });
  return merged;
}

function getEffectiveDeviceMacs() {
  return mergeDeviceMacMaps(DEVICE_MACS, fileDeviceMacs);
}

function isAllowedMac(deviceId, mac) {
  const device = String(deviceId || '').trim().toLowerCase();
  const normalizedMac = normalizeMac(mac);
  if (!device || !normalizedMac) {
    return false;
  }

  const effective = getEffectiveDeviceMacs();
  const list = effective[device];
  if (!list || list.length === 0) {
    return true;
  }
  return list.includes(normalizedMac);
}

function loadFileDeviceMacs() {
  try {
    if (!DEVICE_MACS_FILE || !fs.existsSync(DEVICE_MACS_FILE)) {
      fileDeviceMacs = {};
      return true;
    }

    const raw = JSON.parse(fs.readFileSync(DEVICE_MACS_FILE, 'utf8'));
    fileDeviceMacs = normalizeDeviceMacMap(raw);
    return true;
  } catch (err) {
    console.warn(`Failed to load DEVICE_MACS_FILE (${DEVICE_MACS_FILE}):`, err.message);
    return false;
  }
}

function startDeviceMacsWatcher() {
  loadFileDeviceMacs();
  if (!DEVICE_MACS_FILE) {
    return null;
  }
  if (watcher) {
    return watcher;
  }

  watcher = chokidar.watch(DEVICE_MACS_FILE, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 },
  });

  const reload = () => {
    loadFileDeviceMacs();
  };

  watcher.on('add', reload);
  watcher.on('change', reload);
  watcher.on('unlink', () => {
    fileDeviceMacs = {};
  });

  return watcher;
}

module.exports = {
  normalizeMac,
  isAllowedMac,
  loadFileDeviceMacs,
  startDeviceMacsWatcher,
  getEffectiveDeviceMacs,
};

