const WebSocket = require('ws');
const { getDeviceIdFromWsRequest, getFirmwareInfo } = require('./firmware');

function createWebSocketServer(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket, req) => {
    const deviceId = getDeviceIdFromWsRequest(req);
    socket.deviceId = deviceId;
    console.log(`WebSocket client connected${deviceId ? ` [device=${deviceId}]` : ''}`);

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
