import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addProducts } from '../../../scripts/lib/commands/add-products.js';
import { editorSession } from '../../helpers/editor.js';

test('adds several products with aliases until an empty name', async (t) => {
  const session = editorSession(t, {
    answers: ['  chleb  ', 'chleby, pieczywo ,', 'masło', '', ''],
  });
  await addProducts(session.ctx);
  const data = session.finish(assert);
  assert.deepEqual(data.products.chleb, { aliases: ['chleby', 'pieczywo'] });
  assert.deepEqual(data.products['masło'], { aliases: [] });
});

test('rejects an existing product name', async (t) => {
  const session = editorSession(t, { answers: ['mleko', ''] });
  await addProducts(session.ctx);
  session.finish(assert);
  assert.ok(session.output.includes('Product "mleko" already exists.'));
});

test('does not save a product whose alias collides', async (t) => {
  const session = editorSession(t, { answers: ['sos', 'Passata', ''] });
  await addProducts(session.ctx);
  const data = session.finish(assert);
  assert.equal(data.products.sos, undefined);
  assert.ok(session.output.some((line) => /collides with product "passata"/.test(line)));
});

test('does not save names containing parser characters', async (t) => {
  const session = editorSession(t, { answers: ['mleko (UHT)', '', ''] });
  await addProducts(session.ctx);
  const data = session.finish(assert);
  assert.equal(Object.keys(data.products).length, 4);
  assert.ok(session.output.some((line) => /can't contain/.test(line)));
});
