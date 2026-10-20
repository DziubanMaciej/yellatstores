import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addAliases } from '../../../scripts/lib/commands/add-aliases.js';
import { editorSession } from '../../helpers/editor.js';

test('finds a product by an alias (ignoring diacritics) and adds aliases', async (t) => {
  const session = editorSession(t, { answers: ['POMIDOROW', 'pomidorki', ''] });
  await addAliases(session.ctx);
  const data = session.finish(assert);
  assert.deepEqual(data.products.pomidory.aliases, ['pomidor', 'pomidorów', 'pomidorki']);
});

test('adds aliases to a recipe', async (t) => {
  const session = editorSession(t, { answers: ['spaghetti', 'spagetti', ''] });
  await addAliases(session.ctx);
  const data = session.finish(assert);
  assert.deepEqual(data.recipes.spaghetti.aliases, ['spaghetti bolońskie', 'spagetti']);
});

test('reports unknown names and colliding aliases', async (t) => {
  const session = editorSession(t, { answers: ['chleb', 'mleko', 'makarony', ''] });
  await addAliases(session.ctx);
  const data = session.finish(assert);
  assert.deepEqual(data.products.mleko.aliases, []);
  assert.ok(session.output.includes('No product or recipe matches "chleb".'));
  assert.ok(session.output.some((line) => /collides with/.test(line)));
});
