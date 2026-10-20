import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('package.json uses ES modules', () => {
  assert.equal(pkg.type, 'module');
});

// Dependencies are only added with the user's explicit approval (see CLAUDE.md).
// If one gets approved, update this test deliberately.
test('package.json declares no dependencies', () => {
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});
