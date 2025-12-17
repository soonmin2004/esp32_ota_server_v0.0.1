const fs = require('fs');
const path = require('path');
const { LOG_FILE, LOG_DIR } = require('../config');

function appendLog(entry) {
  const line = JSON.stringify(entry) + '\n';
  const targets = [LOG_FILE];

  if (entry.device) {
    targets.push(path.join(LOG_DIR, `ota-${entry.device}.log`));
  } else {
    targets.push(path.join(LOG_DIR, 'ota-unknown.log'));
  }

  targets.forEach((file) => {
    try {
      fs.appendFileSync(file, line);
    } catch (err) {
      console.warn(`Failed to write log entry to ${path.basename(file)}:`, err.message);
    }
  });
}

module.exports = {
  appendLog,
};
