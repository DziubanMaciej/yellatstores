import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editLayout } from '../../../scripts/lib/commands/edit-layout.js';
import { editorSession } from '../../helpers/editor.js';
import { sampleData } from '../../helpers/sample-data.js';

// Sample store: sections 1) Warzywa 2) Makarony 3) Nabiał; decorations 1) "Kasy" 2) "Wejście" (text only).
// Each script starts with: store 1, then actions; ends with q to leave the action menu.
// Actions: 1) edit in browser 2) rename a section 3) change a decoration label.

const sampleLayout = () => {
  const { sections, decorations } = sampleData().stores['Lidl Główna'];
  return { sections, decorations };
};

test('saves the layout edited in the browser: moved, resized and new rects', async (t) => {
  const edited = sampleLayout();
  edited.sections[0].rect = { x: 0, y: 20, w: 3, h: 3 }; // Warzywa moved and resized
  edited.sections.push({ name: 'Pieczywo', rect: { x: 30, y: 0, w: 4, h: 4 } });
  edited.decorations.push({ rect: { x: 30, y: 6, w: 4, h: 1 } });
  const session = editorSession(t, { answers: ['1', '1', 'q'], pages: [edited] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.deepEqual(store.sections, edited.sections);
  assert.deepEqual(store.decorations, edited.decorations);
  assert.equal(store.products.pomidory, 'Warzywa');
  assert.deepEqual(session.pageCalls[0].params.layout, sampleLayout());
});

test('a layout with rects too close together is not saved', async (t) => {
  const edited = sampleLayout();
  edited.sections[1].rect.x = 10; // touches Warzywa
  const session = editorSession(t, { answers: ['1', '1', 'q'], pages: [edited] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.equal(store.sections[1].rect.x, 12);
  assert.ok(session.output.some((line) => /closer than 1 unit/.test(line)));
});

test('cancelling in the browser changes nothing', async (t) => {
  const session = editorSession(t, { answers: ['1', '1', 'q'], pages: [null] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.deepEqual({ sections: store.sections, decorations: store.decorations }, sampleLayout());
  assert.ok(session.output.includes('Cancelled.'));
});

test('renaming a section moves its product assignments along', async (t) => {
  const session = editorSession(t, { answers: ['1', '2', '2', 'Makarony i kasze', 'q'] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.equal(store.sections[1].name, 'Makarony i kasze');
  assert.equal(store.products.makaron, 'Makarony i kasze');
});

test('renaming to an existing section name is refused', async (t) => {
  const session = editorSession(t, { answers: ['1', '2', '2', 'warzywa', 'q'] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.equal(store.sections[1].name, 'Makarony');
  assert.ok(session.output.some((line) => /used more than once/.test(line)));
});

test('changes and removes decoration labels, but a text-only decoration keeps its label', async (t) => {
  const session = editorSession(t, { answers: ['1', '3', '1', 'Kasy samoobsługowe', '3', '1', '', '3', '2', '', 'q'] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.equal(store.decorations[0].label, undefined);
  assert.equal(store.decorations[1].label, 'Wejście');
  assert.ok(session.output.some((line) => /an invisible decoration needs a label/.test(line)));
});
