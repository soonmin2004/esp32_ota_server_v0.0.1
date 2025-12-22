const { getFirmwareInfo, selectFirmware, normalizeDeviceId } = require('../models/firmware.model');
const { appendLog } = require('../utils/logger');
const { appendUpdateHistoryLog } = require('../utils/updateLogger');
const errors = require('../constants/errors');

// OTA HTTP handlers: health, metadata, binary download, and client report logging.
function health(_req, res) {
  res.json({ ok: true });
}

function firmwareInfo(req, res) {
  const deviceId = req.deviceAuth ? req.deviceAuth.deviceId : null;

  const info = getFirmwareInfo(deviceId);
  if (!info) {
    res.status(404).json({ error: errors.FIRMWARE_NOT_FOUND });
    return;
  }
  res.json(info);
}

function firmware(req, res) {
  const deviceId = req.deviceAuth ? req.deviceAuth.deviceId : null;

  const { firmwarePath } = selectFirmware(deviceId);
  res.sendFile(firmwarePath, (err) => {
    if (err) {
      res.status(err.statusCode || 500).json({ error: errors.FIRMWARE_NOT_FOUND });
    }
  });
}

function report(req, res) {
  const now = new Date().toISOString();
  const {
    currentVersion = null,
    targetVersion = null,
    status = 'unknown',
    message = '',
    info = {},
  } = req.body || {};

  const deviceId = req.deviceAuth ? req.deviceAuth.deviceId : null;
  const mac = req.deviceAuth ? req.deviceAuth.mac : 'unknown';
  const normalizedDevice = normalizeDeviceId(deviceId);
  const entry = {
    ts: now,
    ip: req.ip,
    mac,
    device: normalizedDevice.error ? null : normalizedDevice.deviceId,
    currentVersion,
    targetVersion,
    status,
    message,
    info,
  };

  appendLog(entry);
  if (String(status).toLowerCase() === 'success') {
    appendUpdateHistoryLog(entry);
  }
  res.json({ ok: true });
}

module.exports = {
  health,
  firmwareInfo,
  firmware,
  report,
};
