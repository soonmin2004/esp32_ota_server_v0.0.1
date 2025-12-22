const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  FIRMWARE_DIR,
  FIRMWARE_FILE,
  SUPPORTED_DEVICES,
} = require('../config');

// Firmware selection/metadata helpers: resolve device-specific files, manifest, hash, and URLs.
const WATCH_GLOBS = [
  path.join(FIRMWARE_DIR, '**', '*.bin'),
  path.join(FIRMWARE_DIR, '**', '*.manifest.json'),
  path.join(FIRMWARE_DIR, '**', 'manifest.json'),
];

function buildFirmwareUrl(deviceId) {
  if (!deviceId) {
    return '/firmware';
  }
  return `/firmware?device=${encodeURIComponent(deviceId)}`;
}

function normalizeDeviceId(raw) {
  if (!raw) {
    return { deviceId: null };
  }

  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) {
    return { deviceId: null };
  }
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    return { error: 'invalid_device' };
  }
  if (SUPPORTED_DEVICES.length > 0 && !SUPPORTED_DEVICES.includes(normalized)) {
    return { error: 'invalid_device' };
  }

  return { deviceId: normalized };
}

function getDeviceIdFromRequest(req) {
  const raw = req.query.device || req.headers['x-device-id'];
  return normalizeDeviceId(raw);
}

function getDeviceIdFromWsRequest(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const rawDevice = url.searchParams.get('device');
    const { deviceId, error } = normalizeDeviceId(rawDevice);
    if (error) {
      console.warn(`Rejecting invalid device on WebSocket: ${rawDevice}`);
      return null;
    }
    return deviceId;
  } catch (err) {
    console.warn('Failed to parse WebSocket URL for device:', err.message);
    return null;
  }
}

function resolveFirmwarePaths(deviceId = null) {
  const firmwareCandidates = [];
  const manifestCandidates = [];

  if (deviceId) {
    const deviceDir = path.join(FIRMWARE_DIR, deviceId);
    firmwareCandidates.push({ path: path.join(deviceDir, 'rollback.bin'), kind: 'rollback' });
    firmwareCandidates.push({ path: path.join(deviceDir, `${deviceId}-rollback.bin`), kind: 'rollback' });
    firmwareCandidates.push({ path: path.join(FIRMWARE_DIR, `${deviceId}-rollback.bin`), kind: 'rollback' });

    firmwareCandidates.push({ path: path.join(deviceDir, 'update.bin'), kind: 'normal' });
    firmwareCandidates.push({ path: path.join(deviceDir, `${deviceId}-update.bin`), kind: 'normal' });
    firmwareCandidates.push({ path: path.join(deviceDir, 'firmware.bin'), kind: 'normal' });
    firmwareCandidates.push({ path: path.join(deviceDir, `${deviceId}.bin`), kind: 'normal' });
    firmwareCandidates.push({ path: path.join(FIRMWARE_DIR, `${deviceId}-update.bin`), kind: 'normal' });
    firmwareCandidates.push({ path: path.join(FIRMWARE_DIR, `${deviceId}.bin`), kind: 'normal' });

    manifestCandidates.push(path.join(deviceDir, 'manifest.json'));
    manifestCandidates.push(path.join(deviceDir, `${deviceId}.manifest.json`));
    manifestCandidates.push(path.join(FIRMWARE_DIR, `${deviceId}.manifest.json`));
  }

  firmwareCandidates.push({ path: path.join(FIRMWARE_DIR, FIRMWARE_FILE), kind: 'normal' });
  manifestCandidates.push(path.join(FIRMWARE_DIR, 'manifest.json'));

  return { firmwareCandidates, manifestCandidates };
}

function loadManifest(candidates) {
  const manifestPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!manifestPath) {
    return { manifest: null, manifestPath: null };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return { manifest, manifestPath };
  } catch (err) {
    console.warn(`Failed to read ${path.basename(manifestPath)}:`, err.message);
    return { manifest: null, manifestPath };
  }
}

function selectFirmware(deviceId = null) {
  const { firmwareCandidates, manifestCandidates } = resolveFirmwarePaths(deviceId);
  const { manifest, manifestPath } = loadManifest(manifestCandidates);

  const preferredKind = manifest && manifest.rollback ? 'rollback' : 'normal';

  let firmwareEntry = firmwareCandidates.find(
    (c) => c.kind === preferredKind && fs.existsSync(c.path),
  );

  // If rollback was requested but rollback image is missing, fall back to any normal image.
  if (!firmwareEntry && preferredKind === 'rollback') {
    firmwareEntry = firmwareCandidates.find((c) => c.kind === 'normal' && fs.existsSync(c.path));
  }

  // Final fallback: first existing of any kind, else first candidate.
  if (!firmwareEntry) {
    firmwareEntry = firmwareCandidates.find((c) => fs.existsSync(c.path)) || firmwareCandidates[0];
  }

  return {
    firmwarePath: firmwareEntry.path,
    firmwareFile: path.basename(firmwareEntry.path),
    manifest,
    manifestPath,
  };
}

function getFirmwareInfo(deviceId = null) {
  const { firmwarePath, firmwareFile, manifest, manifestPath } = selectFirmware(deviceId);
  if (!fs.existsSync(firmwarePath)) {
    return null;
  }

  const stats = fs.statSync(firmwarePath);
  let manifestVersion = null;
  let rolloutPercent = 100;
  let rollback = false;
  let rollbackVersion = null;

  if (manifestPath && manifest) {
    manifestVersion = manifest.version || null;
    if (typeof manifest.rolloutPercent === 'number') {
      rolloutPercent = Math.min(100, Math.max(0, Math.round(manifest.rolloutPercent)));
    }
    rollback = Boolean(manifest.rollback);
    rollbackVersion = manifest.rollbackVersion || null;
  }

  return {
    device: deviceId,
    filename: firmwareFile,
    version: manifestVersion || hashFile(firmwarePath),
    size: stats.size,
    modified: stats.mtime.toISOString(),
    rolloutPercent,
    rollback,
    rollbackVersion,
    url: buildFirmwareUrl(deviceId),
  };
}

function deriveDeviceIdFromPath(filePath) {
  if (!filePath) {
    return null;
  }
  const rel = path.relative(FIRMWARE_DIR, filePath);
  if (!rel.startsWith('..')) {
    const parts = rel.split(path.sep).filter(Boolean);
    if (parts.length > 0) {
      const { deviceId, error } = normalizeDeviceId(parts[0]);
      if (!error && deviceId) {
        return deviceId;
      }
    }
  }

  const filename = path.basename(filePath);
  if (filename === path.basename(FIRMWARE_FILE)) {
    return null;
  }
  if (filename === 'manifest.json') {
    return null;
  }
  if (filename.endsWith('.manifest.json')) {
    const { deviceId, error } = normalizeDeviceId(filename.replace(/\.manifest\.json$/, ''));
    return error ? null : deviceId;
  }
  if (filename.endsWith('.bin')) {
    const base = filename.replace(/\.bin$/, '');
    const stripped = base.replace(/-(rollback|update)$/, '');
    const { deviceId, error } = normalizeDeviceId(stripped);
    return error ? null : deviceId;
  }
  return null;
}

function hashFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
  WATCH_GLOBS,
  buildFirmwareUrl,
  normalizeDeviceId,
  getDeviceIdFromRequest,
  getDeviceIdFromWsRequest,
  deriveDeviceIdFromPath,
  resolveFirmwarePaths,
  selectFirmware,
  getFirmwareInfo,
};
