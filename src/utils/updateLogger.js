const fs = require('fs');
const path = require('path');
const { LOG_DIR } = require('../config');

function safe(value) {
  if (value === null || value === undefined) {
    return '-';
  }
  const text = String(value);
  return text.replace(/\s+/g, ' ').trim() || '-';
}

function formatLine(entry) {
  // Format: date deviceId fromVersion toVersion mac ip status message
  const ts = safe(entry.ts);
  const device = safe(entry.device);
  const fromV = safe(entry.currentVersion);
  const toV = safe(entry.targetVersion);
  const mac = safe(entry.mac);
  const ip = safe(entry.ip);
  const status = safe(entry.status);
  const message = safe(entry.message);

  return `${ts}\t${device}\t${fromV}\t${toV}\t${mac}\t${ip}\t${status}\t${message}\n`;
}

function appendUpdateHistoryLog(entry) {
  const line = formatLine(entry);
  const targets = [path.join(LOG_DIR, 'ota-updates.log')];

  if (entry.device) {
    targets.push(path.join(LOG_DIR, `ota-updates-${entry.device}.log`));
  } else {
    targets.push(path.join(LOG_DIR, 'ota-updates-unknown.log'));
  }

  targets.forEach((file) => {
    try {
      fs.appendFileSync(file, line);
    } catch (err) {
      console.warn(`Failed to write update history to ${path.basename(file)}:`, err.message);
    }
  });
}

module.exports = {
  appendUpdateHistoryLog,
};

