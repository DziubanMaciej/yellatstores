import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../scripts/lib/commands/create-store.js';
import { editorSession } from '../../helpers/editor.js';

const drawn = {
  sections: [
    { id: 1, name: 'Pieczywo', rect: { x: 0, y: 0, w: 10, h: 5 } },
    { id: 2, name: 'Owoce', rect: { x: 12, y: 0, w: 6, h: 5 } },
  ],
  decorations: [{ rect: { x: 0, y: 8, w: 4, h: 2 }, label: 'Wejście', visible: false }],
};

test('creates a store from the drawn layout', async (t) => {
  const session = editorSession(t, { answers: ['Lidl Główna', 'Biedronka'], pages: [drawn] });
  await createStore(session.ctx);
  const data = session.finish(assert);
  assert.ok(session.output.includes('Store "Lidl Główna" already exists.'));
  assert.deepEqual(data.stores.Biedronka, { ...drawn, products: {} });
  assert.deepEqual(session.pageCalls[0].params.layout, { sections: [], decorations: [] });
});

test('cancelling the drawing creates nothing', async (t) => {
  const session = editorSession(t, { answers: ['Biedronka'], pages: [null] });
  await createStore(session.ctx);
  const data = session.finish(assert);
  assert.equal(data.stores.Biedronka, undefined);
});

test('an invalid drawing is not saved', async (t) => {
  const overlapping = {
    sections: [
      { id: 1, name: 'A', rect: { x: 0, y: 0, w: 10, h: 5 } },
      { id: 2, name: 'B', rect: { x: 5, y: 0, w: 10, h: 5 } },
    ],
    decorations: [],
  };
  const session = editorSession(t, { answers: ['Biedronka'], pages: [overlapping] });
  await createStore(session.ctx);
  const data = session.finish(assert);
  assert.equal(data.stores.Biedronka, undefined);
  assert.ok(session.output.some((line) => /closer than 1 unit/.test(line)));
});
