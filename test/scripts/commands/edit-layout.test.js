import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editLayout } from '../../../scripts/lib/commands/edit-layout.js';
import { editorSession } from '../../helpers/editor.js';

// Sample store: sections 1) Warzywa 2) Makarony 3) Nabiał; decorations 1) "Kasy" 2) "Wejście" (text only).
// Each script starts with: store 1, then actions; ends with q to leave the action menu.

test('adds new sections and decorations after the existing ones', async (t) => {
  const drawn = {
    sections: [{ name: 'Pieczywo', rect: { x: 30, y: 0, w: 4, h: 4 } }],
    decorations: [{ rect: { x: 30, y: 6, w: 4, h: 1 } }],
  };
  const session = editorSession(t, { answers: ['1', '1', 'q'], pages: [drawn] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.deepEqual(
    store.sections.map((s) => s.name),
    ['Warzywa', 'Makarony', 'Nabiał', 'Pieczywo'],
  );
  assert.equal(store.decorations.length, 3);
  assert.equal(session.pageCalls[0].params.target, null);
});

test('redraws a section, keeping its name, position in the list and products', async (t) => {
  const session = editorSession(t, { answers: ['1', '2', '1', 'q'], pages: [{ rect: { x: 0, y: 20, w: 3, h: 3 } }] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.deepEqual(store.sections[0], { name: 'Warzywa', rect: { x: 0, y: 20, w: 3, h: 3 } });
  assert.equal(store.products.pomidory, 'Warzywa');
  const { params } = session.pageCalls[0];
  assert.deepEqual(params.target, { kind: 'section', name: 'Warzywa' });
  assert.deepEqual(params.ghost, { x: 0, y: 0, w: 10, h: 8 });
  assert.deepEqual(
    params.layout.sections.map((s) => s.name),
    ['Makarony', 'Nabiał'],
  );
});

test('redraws a decoration', async (t) => {
  const session = editorSession(t, { answers: ['1', '3', '2', 'q'], pages: [{ rect: { x: 30, y: 30, w: 5, h: 2 } }] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.deepEqual(store.decorations[1], { rect: { x: 30, y: 30, w: 5, h: 2 }, label: 'Wejście', visible: false });
  assert.deepEqual(session.pageCalls[0].params.target, { kind: 'decoration', label: 'Wejście', visible: false });
});

test('renaming a section moves its product assignments along', async (t) => {
  const session = editorSession(t, { answers: ['1', '4', '2', 'Makarony i kasze', 'q'] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.equal(store.sections[1].name, 'Makarony i kasze');
  assert.equal(store.products.makaron, 'Makarony i kasze');
});

test('renaming to an existing section name is refused', async (t) => {
  const session = editorSession(t, { answers: ['1', '4', '2', 'warzywa', 'q'] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.equal(store.sections[1].name, 'Makarony');
  assert.ok(session.output.some((line) => /used more than once/.test(line)));
});

test('changes and removes decoration labels, but a text-only decoration keeps its label', async (t) => {
  const session = editorSession(t, { answers: ['1', '5', '1', 'Kasy samoobsługowe', '5', '1', '', '5', '2', '', 'q'] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.equal(store.decorations[0].label, undefined);
  assert.equal(store.decorations[1].label, 'Wejście');
  assert.ok(session.output.some((line) => /an invisible decoration needs a label/.test(line)));
});
