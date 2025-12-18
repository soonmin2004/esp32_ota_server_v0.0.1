const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateKey() {
  // 256-bit key, URL-safe.
  return crypto.randomBytes(32).toString('base64url');
}

function upsertEnvLine(lines, key, value) {
  const re = new RegExp(`^${key}=`, 'i');
  const idx = lines.findIndex((l) => re.test(l));
  const line = `${key}=${value}`;
  if (idx >= 0) {
    lines[idx] = line;
  } else {
    lines.push(line);
  }
  return lines;
}

function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
    envPath: (() => {
      const idx = argv.indexOf('--env');
      if (idx >= 0 && argv[idx + 1]) {
        return argv[idx + 1];
      }
      return '.env';
    })(),
    append: argv.includes('--append'),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const key = generateKey();

  if (!args.write) {
    process.stdout.write(`${key}\n`);
    return;
  }

  const envPath = path.isAbsolute(args.envPath)
    ? args.envPath
    : path.join(process.cwd(), args.envPath);

  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  const lines = content
    .split(/\r?\n/)
    .filter((l, idx, arr) => !(idx === arr.length - 1 && l === ''));

  const existing = lines.find((l) => /^API_KEYS=/i.test(l));
  if (args.append && existing) {
    const current = existing.split('=').slice(1).join('=').trim();
    const next = current ? `${current},${key}` : key;
    upsertEnvLine(lines, 'API_KEYS', next);
  } else {
    upsertEnvLine(lines, 'API_KEYS', key);
  }

  fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');
  process.stdout.write(`updated ${path.relative(process.cwd(), envPath)}\n`);
  process.stdout.write(`API_KEYS=${key}\n`);
}

main();

