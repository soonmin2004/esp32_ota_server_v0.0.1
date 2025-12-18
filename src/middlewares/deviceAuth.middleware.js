const { API_KEYS } = require('../config');
const errors = require('../constants/errors');
const { normalizeDeviceId } = require('../models/firmware.model');
const { normalizeMac, isAllowedMac } = require('../services/deviceRegistry.service');

function getApiKey(req) {
  return req.headers['x-api-key'] || req.query.key || null;
}

function getDeviceId(req) {
  return req.query.device || req.headers['x-device-id'] || (req.body && req.body.device) || null;
}

function getMac(req) {
  return req.headers['x-mac'] || req.query.mac || (req.body && req.body.mac) || null;
}

module.exports = function deviceAuth(req, res, next) {
  if (!API_KEYS || API_KEYS.length === 0) {
    res.status(500).json({ error: errors.SERVER_MISCONFIGURED });
    return;
  }

  const apiKey = String(getApiKey(req) || '').trim();
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    res.status(401).json({ error: errors.INVALID_API_KEY });
    return;
  }

  const normalized = normalizeDeviceId(getDeviceId(req));
  if (normalized.error || !normalized.deviceId) {
    res.status(400).json({ error: errors.INVALID_DEVICE });
    return;
  }

  const mac = normalizeMac(getMac(req));
  if (!mac) {
    res.status(400).json({ error: errors.INVALID_MAC });
    return;
  }

  if (!isAllowedMac(normalized.deviceId, mac)) {
    res.status(403).json({ error: errors.INVALID_MAC });
    return;
  }

  req.deviceAuth = { deviceId: normalized.deviceId, mac };
  next();
};
