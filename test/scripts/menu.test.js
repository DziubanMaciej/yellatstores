import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMenu } from '../../scripts/lib/menu.js';
import { editorSession } from '../helpers/editor.js';

test('runs commands from the main menu until q', async (t) => {
  // 3 = Add products: add "chleb" without aliases; 8 = Validate data; q = quit
  const session = editorSession(t, { answers: ['3', 'chleb', '', '', '8', 'q'] });
  await runMenu(session.ctx);
  const data = session.finish(assert);
  assert.deepEqual(data.products.chleb, { aliases: [] });
  assert.ok(session.output.includes('Data is valid.'));
});

test('an error inside a command is reported and in-memory changes are dropped', async (t) => {
  // 1 = Create store; the drawing page "crashes" (no scripted page result left).
  const session = editorSession(t, { answers: ['1', 'Biedronka', 'q'] });
  session.ctx.data.products.zmiana = { aliases: [] }; // unsaved change that must be dropped
  await runMenu(session.ctx);
  session.finish(assert);
  assert.ok(session.output.some((line) => line.startsWith('Error: No scripted page result left')));
  assert.equal(session.ctx.data.products.zmiana, undefined);
});
