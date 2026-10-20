import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadData, saveData, ValidationError } from '../../scripts/lib/data.js';
import { FILES, formatJson } from '../../scripts/lib/format.js';
import { sampleData, tempDataDir } from '../helpers/sample-data.js';

const readAll = (dir) => FILES.map((file) => readFileSync(join(dir, file), 'utf8'));

test('load then save leaves files byte-identical', (t) => {
  const { dir, cleanup } = tempDataDir();
  t.after(cleanup);
  const before = readAll(dir);
  saveData(dir, loadData(dir));
  assert.deepEqual(readAll(dir), before);
});

test('save sorts name-keyed objects alphabetically but keeps section order', (t) => {
  const data = sampleData();
  const store = data.stores['Lidl Główna'];
  store.sections.reverse();
  data.products = { zupa: { aliases: [] }, łosoś: { aliases: [] }, ...data.products };
  const { dir, cleanup } = tempDataDir(data);
  t.after(cleanup);
  const loaded = loadData(dir);
  assert.deepEqual(Object.keys(loaded.products), ['łosoś', 'makaron', 'mleko', 'passata', 'pomidory', 'zupa']);
  assert.deepEqual(
    loaded.stores['Lidl Główna'].sections.map((s) => s.name),
    ['Nabiał', 'Makarony', 'Warzywa'],
  );
});

test('save refuses invalid data and writes nothing', (t) => {
  const { dir, cleanup } = tempDataDir();
  t.after(cleanup);
  const before = readAll(dir);
  const data = sampleData();
  data.recipes.spaghetti.ingredients.push('bazylia');
  assert.throws(() => saveData(dir, data), ValidationError);
  assert.deepEqual(readAll(dir), before);
});

test('formatJson keeps short plain objects and arrays on one line', () => {
  const text = formatJson({ rect: { x: 0, y: 0, w: 10, h: 8 }, aliases: ['a', 'b'], empty: [] });
  assert.equal(
    text,
    '{\n  "rect": { "x": 0, "y": 0, "w": 10, "h": 8 },\n  "aliases": ["a", "b"],\n  "empty": []\n}\n',
  );
});

test('formatJson breaks long plain arrays over several lines', () => {
  const long = Array.from({ length: 10 }, (_, i) => `alias number ${i}`);
  const text = formatJson(long);
  assert.equal(text.split('\n').length, 13);
});
