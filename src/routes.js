const express = require('express');
const {
  getDeviceIdFromRequest,
  getFirmwareInfo,
  selectFirmware,
  normalizeDeviceId,
} = require('./lib/firmware');
const { appendLog } = require('./lib/logger');

function createRouter() {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/firmware/info', (req, res) => {
    const { deviceId, error } = getDeviceIdFromRequest(req);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const info = getFirmwareInfo(deviceId);
    if (!info) {
      res.status(404).json({ error: 'firmware_not_found' });
      return;
    }
    res.json(info);
  });

  router.get('/firmware', (req, res) => {
    const { deviceId, error } = getDeviceIdFromRequest(req);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const { firmwarePath } = selectFirmware(deviceId);
    res.sendFile(firmwarePath, (err) => {
      if (err) {
        res.status(err.statusCode || 500).json({ error: 'firmware_not_found' });
      }
    });
  });

  router.post('/report', (req, res) => {
    const now = new Date().toISOString();
    const {
      mac = 'unknown',
      currentVersion = null,
      targetVersion = null,
      status = 'unknown',
      message = '',
      info = {},
      device = null,
    } = req.body || {};

    const normalizedDevice = normalizeDeviceId(device || req.query.device || req.headers['x-device-id']);
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
    res.json({ ok: true });
  });

  return router;
}

module.exports = {
  createRouter,
};
