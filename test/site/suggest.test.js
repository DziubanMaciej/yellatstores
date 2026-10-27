import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editDistance, fixList, suggest } from '../../site/lib/suggest.js';
import { sampleData } from '../helpers/sample-data.js';

// Sample products: makaron (makarony), mleko, passata, pomidory (pomidor, pomidorów).
// Recipe: spaghetti (spaghetti bolońskie).
const data = sampleData();

test('editDistance counts inserts, deletes, changes and swaps of neighbours', () => {
  assert.equal(editDistance('mleko', 'mleko'), 0);
  assert.equal(editDistance('mleko', 'mleka'), 1);
  assert.equal(editDistance('mleko', 'mlko'), 1);
  assert.equal(editDistance('mleko', 'mlekko'), 1);
  assert.equal(editDistance('mleko', 'mlkeo'), 1);
  assert.equal(editDistance('', 'abc'), 3);
  assert.equal(editDistance('ogrorki', 'ogorki'), 1);
});

test('typos get the closest products, matching aliases too, ignoring case and accents', () => {
  assert.deepEqual(suggest('pomidorki', data, { withRecipes: false }), ['pomidory']);
  assert.deepEqual(suggest('MLEKA', data, { withRecipes: false }), ['mleko']);
  assert.deepEqual(suggest('makarontu', data, { withRecipes: false }), ['makaron']); // alias makarony
  assert.deepEqual(suggest('pomidorow', data, { withRecipes: false }), ['pomidory']); // alias pomidorów
});

test('only names within about one edit per three letters are suggested, at most 3, closest first', () => {
  assert.deepEqual(suggest('xyz', data, { withRecipes: true }), []);
  assert.deepEqual(suggest('mlo', data, { withRecipes: false }), []); // 2 edits from mleko, 1 allowed
  assert.deepEqual(suggest('mlekoo', data, { withRecipes: false }), ['mleko']);
  const many = { products: { aa: { aliases: [] }, ab: { aliases: [] }, ac: { aliases: [] }, ad: { aliases: [] }, a: { aliases: [] } }, recipes: {} };
  assert.deepEqual(suggest('ax', many, { withRecipes: false }), ['a', 'aa', 'ab']);
});

test('recipes are suggested only when asked', () => {
  assert.deepEqual(suggest('spagetti', data, { withRecipes: true }), ['spaghetti']);
  assert.deepEqual(suggest('spagetti', data, { withRecipes: false }), []);
  assert.deepEqual(suggest('spaghetti bolonskei', data, { withRecipes: true }), ['spaghetti']);
});

test('fixList replaces the name on every line naming it, keeping quantities and notes', () => {
  const text = 'chleb\n2 Ogrórki (małe)\nogrorki x2\ndwa ogrórki\nogrórki kiszone';
  assert.equal(
    fixList(text, 'ogrórki', 'ogórki'),
    'chleb\n2 ogórki (małe)\nogórki x2\ndwa ogórki\nogrórki kiszone',
  );
});

test('fixList leaves notes alone, keeps line endings and odd spacing, and handles special characters', () => {
  assert.equal(fixList('(ogrórki) ogrórki (ogrórki)', 'ogrórki', 'ogórki'), '(ogrórki) ogórki (ogrórki)');
  assert.equal(fixList('a\r\n  zielony   groszk \r\nb', 'zielony groszk', 'groszek'), 'a\r\n  groszek \r\nb');
  assert.equal(fixList('c++ [x]', 'c++ [x]', 'c'), 'c');
});
