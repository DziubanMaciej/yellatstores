import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assignProducts } from '../../../scripts/lib/commands/assign-products.js';
import { editorSession } from '../../helpers/editor.js';
import { sampleData } from '../../helpers/sample-data.js';

// Sample store section ids: 1 Warzywa, 2 Makarony, 3 Nabiał. Unassigned there: mleko only.
function dataWithMoreProducts() {
  const data = sampleData();
  data.products.chleb = { aliases: [] };
  data.products.jajka = { aliases: [] };
  return data;
}

// Plays the assign page: sends each message in turn and records the replies.
function clickingPage(messages, replies) {
  return async (params, onMessage) => {
    for (const message of messages) {
      replies.push(await onMessage(message));
    }
    return {};
  };
}

test('the page gets the unassigned products alphabetically and the map with ids', async (t) => {
  const session = editorSession(t, { data: dataWithMoreProducts(), answers: ['1'], pages: [{}] });
  await assignProducts(session.ctx);
  session.finish(assert);
  const { kind, params } = session.pageCalls[0];
  assert.equal(kind, 'assignProducts');
  assert.equal(params.title, 'Assign products in "Lidl Główna"');
  assert.deepEqual(params.products, ['chleb', 'jajka', 'mleko']);
  assert.deepEqual(params.sections, [
    { id: 1, name: 'Warzywa' },
    { id: 2, name: 'Makarony' },
    { id: 3, name: 'Nabiał' },
  ]);
  assert.match(params.svg, /class="section-id"/);
  assert.ok(session.output.includes('Done with "Lidl Główna". Still unassigned: 3.'));
});

test('every click is saved immediately; back clears an answer', async (t) => {
  const replies = [];
  let onDiskMidway;
  const page = async (params, onMessage) => {
    replies.push(await onMessage({ product: 'chleb', section: null }));
    replies.push(await onMessage({ product: 'jajka', section: 3 }));
    onDiskMidway = JSON.parse(readFileSync(join(session.dir, 'stores.json'), 'utf8'))['Lidl Główna'].products;
    replies.push(await onMessage({ product: 'mleko', section: 1 }));
    replies.push(await onMessage({ product: 'mleko', unassign: true }));
    return {};
  };
  const session = editorSession(t, { data: dataWithMoreProducts(), answers: ['1'], pages: [page] });
  await assignProducts(session.ctx);
  const products = session.finish(assert).stores['Lidl Główna'].products;
  assert.deepEqual(replies, [{ ok: true }, { ok: true }, { ok: true }, { ok: true }]);
  assert.equal(onDiskMidway.chleb, null);
  assert.equal(onDiskMidway.jajka, 3);
  assert.deepEqual(products, { chleb: null, jajka: 3, makaron: 2, passata: null, pomidory: 1 });
  assert.ok(session.output.includes('Done with "Lidl Główna". Still unassigned: 1.'));
});

test('unknown sections and products are refused', async (t) => {
  const replies = [];
  const page = clickingPage(
    [
      { product: 'mleko', section: 9 },
      { product: 'makaron', section: 1 }, // already assigned, not offered by the page
      { product: 'nieznany', section: 1 },
    ],
    replies,
  );
  const session = editorSession(t, { answers: ['1'], pages: [page] });
  await assignProducts(session.ctx);
  const products = session.finish(assert).stores['Lidl Główna'].products;
  assert.deepEqual(replies, [
    { error: 'Unknown section id 9.' },
    { error: 'Unknown product "makaron".' },
    { error: 'Unknown product "nieznany".' },
  ]);
  assert.deepEqual(products, sampleData().stores['Lidl Główna'].products);
});

test('says so when everything is assigned, without opening the page', async (t) => {
  const data = sampleData();
  data.stores['Lidl Główna'].products.mleko = 3;
  const session = editorSession(t, { data, answers: ['1'] });
  await assignProducts(session.ctx);
  session.finish(assert);
  assert.ok(session.output.includes('All products are already assigned in "Lidl Główna".'));
  assert.deepEqual(session.pageCalls, []);
});
