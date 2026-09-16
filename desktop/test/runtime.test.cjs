'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compareVersions, isValidSQLiteHeader, findFreePort } = require('../lib/runtime.cjs');

test('compareVersions handles semantic release numbers', () => {
  assert.equal(compareVersions('1.2.0', '1.1.0'), 1);
  assert.equal(compareVersions('v1.2.0', '1.2.0'), 0);
  assert.equal(compareVersions('1.1.9', '1.2.0'), -1);
});

test('isValidSQLiteHeader accepts the SQLite magic header only', () => {
  assert.equal(isValidSQLiteHeader(Buffer.from('SQLite format 3\0more-data', 'binary')), true);
  assert.equal(isValidSQLiteHeader(Buffer.from('not sqlite')), false);
});

test('findFreePort returns an ephemeral TCP port', async () => {
  const port = await findFreePort();
  assert.ok(Number.isInteger(port));
  assert.ok(port > 0 && port <= 65535);
});
