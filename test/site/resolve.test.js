import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandRecipes } from '../../site/lib/expand.js';
import { parseEntry } from '../../site/lib/parse.js';
import { locate, resolveEntries } from '../../site/lib/resolve.js';
import { sampleData } from '../helpers/sample-data.js';

const data = sampleData();
const resolve = (...entries) => resolveEntries(expandRecipes(entries.map(parseEntry), data.recipes), data.products);

test('names and aliases match exactly after normalisation; the canonical name is shown', () => {
  assert.deepEqual(resolve(' POMIDORÓW ', 'Makarony', 'mleko'), [
    { product: 'pomidory', name: 'pomidory', notes: [] },
    { product: 'makaron', name: 'makaron', notes: [] },
    { product: 'mleko', name: 'mleko', notes: [] },
  ]);
});

test('duplicates merge into the first one, notes concatenated in order, not summed', () => {
  assert.deepEqual(resolve('2 mleko', 'chleb', '3 mleko (tłuste)'), [
    { product: 'mleko', name: 'mleko', notes: ['2x', '3x', 'tłuste'] },
    { product: null, name: 'chleb', notes: [] },
  ]);
  assert.deepEqual(resolve('2 pomidory', 'spaghetti')[0], { product: 'pomidory', name: 'pomidory', notes: ['2x', 'spaghetti'] });
});

test('unmatched entries are never merged and keep the name as typed', () => {
  assert.deepEqual(resolve('Xyz', 'xyz (a)'), [
    { product: null, name: 'Xyz', notes: [] },
    { product: null, name: 'xyz', notes: ['a'] },
  ]);
  assert.deepEqual(resolve('mleko 2'), [{ product: null, name: 'mleko 2', notes: [] }]);
});

test('locate finds the section, or why the product is unknown', () => {
  const store = data.stores['Lidl Główna']; // makaron → 2, passata → null, mleko unassigned
  const [makaron, passata, mleko, xyz] = resolve('makaron', 'passata', 'mleko', 'xyz');
  assert.deepEqual(locate(makaron, store), { section: 2 });
  assert.deepEqual(locate(passata, store), { unknown: 'nie ma w tym sklepie' });
  assert.deepEqual(locate(mleko, store), { unknown: 'nieprzypisany w tym sklepie' });
  assert.deepEqual(locate(xyz, store), { unknown: 'nieznany produkt' });
});
