import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addRecipes } from '../../../scripts/lib/commands/add-recipes.js';
import { editorSession } from '../../helpers/editor.js';

test('adds a recipe with aliases and ingredients picked by name or alias', async (t) => {
  const session = editorSession(t, {
    answers: ['lasagne', 'lazania', 'Pomidor', 'makarony', 'pomidory', 'bazylia', 'mleko', '', ''],
  });
  await addRecipes(session.ctx);
  const data = session.finish(assert);
  assert.deepEqual(data.recipes.lasagne, { aliases: ['lazania'], ingredients: ['pomidory', 'makaron', 'mleko'] });
  assert.ok(session.output.includes('"pomidory" is already an ingredient.'));
  assert.ok(session.output.some((line) => line.startsWith('No product matches "bazylia"')));
});

test('a recipe cannot be an ingredient, and a recipe needs ingredients', async (t) => {
  const session = editorSession(t, { answers: ['zapiekanka', '', 'spaghetti', '', ''] });
  await addRecipes(session.ctx);
  const data = session.finish(assert);
  assert.equal(data.recipes.zapiekanka, undefined);
  assert.ok(session.output.includes('A recipe needs at least one ingredient. Not added.'));
});
