import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewStore } from '../../../scripts/lib/commands/view-store.js';
import { buildStoreView } from '../../../scripts/lib/store-view.js';
import { editorSession } from '../../helpers/editor.js';
import { sampleData } from '../../helpers/sample-data.js';

test('store view groups products alphabetically by section, then not carried and unassigned', () => {
  const data = sampleData();
  data.products.cebula = { aliases: [] };
  data.stores['Lidl Główna'].products.cebula = 1;
  const view = buildStoreView(data, 'Lidl Główna');
  assert.equal(view.title, 'Lidl Główna');
  assert.match(view.svg, /^<svg /);
  assert.match(view.svg, /class="section-id"/);
  assert.deepEqual(view.groups, [
    { title: '1) Warzywa', items: ['cebula', 'pomidory'] },
    { title: '2) Makarony', items: ['makaron'] },
    { title: '3) Nabiał', items: [] },
    { title: 'Not in this store', items: ['passata'] },
    { title: 'Unassigned', items: ['mleko'] },
  ]);
});

test('view store opens the page with the store view', async (t) => {
  const session = editorSession(t, { answers: ['1'], pages: [{}] });
  await viewStore(session.ctx);
  session.finish(assert);
  assert.equal(session.pageCalls[0].kind, 'showStore');
  assert.equal(session.pageCalls[0].params.title, 'Lidl Główna');
});
