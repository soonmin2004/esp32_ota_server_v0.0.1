const WebSocket = require('ws');
const { API_KEYS } = require('../config');
const errors = require('../constants/errors');
const { getDeviceIdFromWsRequest, getFirmwareInfo, normalizeDeviceId } = require('../models/firmware.model');
const { normalizeMac, isAllowedMac } = require('./deviceRegistry.service');

function getWsParam(req, name) {
  try {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get(name);
  } catch (_err) {
    return null;
  }
}

function authenticateWs(req) {
  if (!API_KEYS || API_KEYS.length === 0) {
    return { ok: false, code: 1011, reason: errors.SERVER_MISCONFIGURED };
  }

  const apiKey = String(req.headers['x-api-key'] || getWsParam(req, 'key') || '').trim();
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return { ok: false, code: 1008, reason: errors.INVALID_API_KEY };
  }

  const deviceFromQuery = getDeviceIdFromWsRequest(req);
  const normalized = normalizeDeviceId(deviceFromQuery);
  if (normalized.error || !normalized.deviceId) {
    return { ok: false, code: 1008, reason: errors.INVALID_DEVICE };
  }

  const mac = normalizeMac(req.headers['x-mac'] || getWsParam(req, 'mac'));
  if (!mac) {
    return { ok: false, code: 1008, reason: errors.INVALID_MAC };
  }
  if (!isAllowedMac(normalized.deviceId, mac)) {
    return { ok: false, code: 1008, reason: errors.INVALID_MAC };
  }

  return { ok: true, deviceId: normalized.deviceId };
}

function createWebSocketServer(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket, req) => {
    const auth = authenticateWs(req);
    if (!auth.ok) {
      socket.close(auth.code, auth.reason);
      return;
    }

    const deviceId = auth.deviceId;
    socket.deviceId = deviceId;
    console.log(`WebSocket client connected [device=${deviceId}]`);

    const info = getFirmwareInfo(deviceId);
    socket.send(JSON.stringify({ type: 'info', data: info, device: deviceId || null }));

    socket.on('close', () =>
      console.log(`WebSocket client disconnected${deviceId ? ` [device=${deviceId}]` : ''}`),
    );
  });

  function broadcast(deviceId) {
    const info = getFirmwareInfo(deviceId);
    const payload = JSON.stringify({ type: 'update', data: info, device: deviceId || null });
    console.log(
      `Broadcasting firmware update${deviceId ? ` [device=${deviceId}]` : ''}`,
      info,
    );

    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) {
        return;
      }
      if (client.deviceId && client.deviceId !== deviceId) {
        return;
      }
      client.send(payload);
    });
  }

  return { wss, broadcast };
}

module.exports = {
  createWebSocketServer,
};
