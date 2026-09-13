import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const expected = 'Created by NullBot | Copyright 2026';
const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(here, '..');
const required = [
  path.join(desktop, 'main.cjs'),
  path.join(desktop, 'splash.html'),
  path.join(desktop, 'README.md'),
];

for (const file of required) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(expected)) {
    throw new Error(`Required creator attribution is missing from ${path.relative(desktop, file)}.`);
  }
}

console.log(`Desktop attribution verified: ${expected}`);
