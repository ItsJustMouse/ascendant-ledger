'use strict';

const net = require('node:net');

function findFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen({ host, port: 0 }, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForHealth(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const intervalMs = options.intervalMs ?? 250;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const started = Date.now();
  let lastError;

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetchImpl(url, { cache: 'no-store' });
      if (response.ok) {
        const body = await response.json();
        if (body && body.status === 'ok') return body;
        lastError = new Error(`Backend health status was ${String(body?.status ?? 'unknown')}.`);
      } else {
        lastError = new Error(`Backend health returned HTTP ${response.status}.`);
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Ascendant Ledger backend did not become ready within ${timeoutMs}ms.${lastError ? ` Last error: ${lastError.message}` : ''}`);
}

function parseVersion(input) {
  return String(input)
    .trim()
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0)
    .slice(0, 3)
    .concat([0, 0, 0])
    .slice(0, 3);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

function isValidSQLiteHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) return false;
  return buffer.subarray(0, 16).toString('binary') === 'SQLite format 3\u0000';
}

module.exports = {
  findFreePort,
  waitForHealth,
  compareVersions,
  isValidSQLiteHeader,
};
