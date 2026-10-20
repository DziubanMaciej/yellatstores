import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareNames, normalize } from '../../site/lib/normalize.js';

test('normalize lowercases and trims', () => {
  assert.equal(normalize('  Mleko '), 'mleko');
});

test('normalize collapses inner whitespace', () => {
  assert.equal(normalize('ser   żółty\t twardy'), 'ser zolty twardy');
});

test('normalize strips all Polish diacritics, including ł', () => {
  assert.equal(normalize('ąćęłńóśźż'), 'acelnoszz');
  assert.equal(normalize('ĄĆĘŁŃÓŚŹŻ'), 'acelnoszz');
});

test('compareNames uses Polish alphabetical order', () => {
  const sorted = ['żurek', 'łosoś', 'zupa', 'lody', 'ananas'].sort(compareNames);
  assert.deepEqual(sorted, ['ananas', 'lody', 'łosoś', 'zupa', 'żurek']);
});
