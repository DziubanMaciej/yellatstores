import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assignProducts } from '../../../scripts/lib/commands/assign-products.js';
import { editorSession } from '../../helpers/editor.js';
import { sampleData } from '../../helpers/sample-data.js';

// Sample store sections: 1) Warzywa 2) Makarony 3) Nabiał. Unassigned there: mleko only.
function dataWithMoreProducts() {
  const data = sampleData();
  data.products.chleb = { aliases: [] };
  data.products.jajka = { aliases: [] };
  return data;
}

test('asks only for unassigned products, alphabetically, and saves each answer', async (t) => {
  const session = editorSession(t, {
    data: dataWithMoreProducts(),
    // store 1; chleb → not in store; jajka → invalid, then Nabiał; mleko → Nabiał
    answers: ['1', '0', '9', '3', '3'],
  });
  await assignProducts(session.ctx);
  const data = session.finish(assert);
  assert.deepEqual(data.stores['Lidl Główna'].products, {
    chleb: null,
    jajka: 'Nabiał',
    makaron: 'Makarony',
    mleko: 'Nabiał',
    passata: null,
    pomidory: 'Warzywa',
  });
  const asked = session.output.filter((line) => /^\[\d\/3\]/.test(line));
  assert.deepEqual(
    asked.map((line) => line.split(':')[0]),
    ['[1/3] chleb', '[2/3] jajka', '[2/3] jajka', '[3/3] mleko'],
  );
});

test('skip leaves a product unassigned, quit stops with earlier answers saved', async (t) => {
  const session = editorSession(t, { data: dataWithMoreProducts(), answers: ['1', 's', '1', 'q'] });
  await assignProducts(session.ctx);
  const data = session.finish(assert);
  const products = data.stores['Lidl Główna'].products;
  assert.equal(Object.hasOwn(products, 'chleb'), false);
  assert.equal(products.jajka, 'Warzywa');
  assert.equal(Object.hasOwn(products, 'mleko'), false);
  const onDisk = JSON.parse(readFileSync(join(session.dir, 'stores.json'), 'utf8'));
  assert.equal(onDisk['Lidl Główna'].products.jajka, 'Warzywa');
});

test('says so when everything is assigned', async (t) => {
  const data = sampleData();
  data.stores['Lidl Główna'].products.mleko = 'Nabiał';
  const session = editorSession(t, { data, answers: ['1'] });
  await assignProducts(session.ctx);
  session.finish(assert);
  assert.ok(session.output.includes('All products are already assigned in "Lidl Główna".'));
});
