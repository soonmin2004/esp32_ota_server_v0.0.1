const chokidar = require('chokidar');
const { WATCH_GLOBS, deriveDeviceIdFromPath } = require('./firmware');

function createWatcher(onDeviceChange) {
  const watcher = chokidar.watch(WATCH_GLOBS, { ignoreInitial: true });

  const handler = (filePath) => {
    const deviceId = deriveDeviceIdFromPath(filePath);
    onDeviceChange(deviceId);
  };

  watcher.on('add', handler);
  watcher.on('change', handler);
  watcher.on('unlink', handler);

  return watcher;
}

module.exports = {
  createWatcher,
};
