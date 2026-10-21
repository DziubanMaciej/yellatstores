import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandRecipes } from '../../site/lib/expand.js';
import { parseEntry } from '../../site/lib/parse.js';
import { sampleData } from '../helpers/sample-data.js';

const { recipes } = sampleData(); // spaghetti (alias "spaghetti bolońskie"): pomidory, passata, makaron
const expand = (...entries) => expandRecipes(entries.map(parseEntry), recipes);

test('a recipe name or alias becomes its ingredients, each noted with the recipe name', () => {
  const ingredients = [
    { name: 'pomidory', quantity: null, notes: ['spaghetti'] },
    { name: 'passata', quantity: null, notes: ['spaghetti'] },
    { name: 'makaron', quantity: null, notes: ['spaghetti'] },
  ];
  assert.deepEqual(expand('Spaghetti'), ingredients);
  assert.deepEqual(expand('spaghetti bolonskie'), ingredients);
  assert.deepEqual(expand('mleko', 'spaghetti').map((e) => e.name), ['mleko', 'pomidory', 'passata', 'makaron']);
});

test('a recipe with a quantity or notes is not expanded', () => {
  assert.deepEqual(expand('2 spaghetti'), [parseEntry('2 spaghetti')]);
  assert.deepEqual(expand('spaghetti (bez sera)'), [parseEntry('spaghetti (bez sera)')]);
});
