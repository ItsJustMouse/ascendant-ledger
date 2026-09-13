import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(here, '..');
const root = path.resolve(desktopDir, '..');
const serverDir = path.join(root, 'server');
const runtimeDir = path.join(desktopDir, '.server-runtime');
const archArg = process.argv.find((arg) => arg.startsWith('--arch='));
const targetArch = archArg ? archArg.split('=')[1] : process.arch;
const electronVersion = '44.3.0';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args, cwd) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Preparing Ascendant Ledger desktop runtime for ${targetArch}…`);
run(npm, ['ci', '--no-audit', '--no-fund'], serverDir);
run(npm, ['run', 'build'], serverDir);

const migrationSrc = path.join(serverDir, 'src', 'db', 'migrations');
const migrationDest = path.join(serverDir, 'dist', 'db', 'migrations');
fs.mkdirSync(migrationDest, { recursive: true });
fs.cpSync(migrationSrc, migrationDest, { recursive: true });

fs.rmSync(runtimeDir, { recursive: true, force: true });
fs.mkdirSync(runtimeDir, { recursive: true });
fs.cpSync(path.join(serverDir, 'dist'), path.join(runtimeDir, 'dist'), { recursive: true });
fs.cpSync(path.join(serverDir, 'web'), path.join(runtimeDir, 'web'), { recursive: true });
fs.copyFileSync(path.join(serverDir, 'package.json'), path.join(runtimeDir, 'package.json'));
fs.copyFileSync(path.join(serverDir, 'package-lock.json'), path.join(runtimeDir, 'package-lock.json'));

run(npm, ['ci', '--omit=dev', '--no-audit', '--no-fund'], runtimeDir);

console.log('Desktop server runtime prepared successfully.');
