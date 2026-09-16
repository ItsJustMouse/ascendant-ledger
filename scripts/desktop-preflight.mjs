import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const desktop = path.join(root, 'desktop');
const server = path.join(root, 'server');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(args, cwd) {
  const result = spawnSync(npm, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const required of [
  path.join(desktop, 'main.cjs'),
  path.join(desktop, 'package.json'),
  path.join(desktop, 'scripts', 'prepare-runtime.mjs'),
  path.join(server, 'package.json'),
]) {
  if (!fs.existsSync(required)) throw new Error(`Missing required file: ${required}`);
}

run(['run', 'check'], desktop);
console.log('Desktop source preflight passed.');
