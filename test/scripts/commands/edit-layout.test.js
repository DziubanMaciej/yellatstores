import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editLayout } from '../../../scripts/lib/commands/edit-layout.js';
import { editorSession } from '../../helpers/editor.js';
import { sampleData } from '../../helpers/sample-data.js';

// Sample store: sections Warzywa, Makarony, Nabiał; decorations "Kasy", "Wejście" (text only).
// Products: pomidory → Warzywa, makaron → Makarony, passata → null, mleko unassigned.
// Each script is: store 1. The page result is what the layout page would post back.

const sampleLayout = () => {
  const { sections, decorations } = sampleData().stores['Lidl Główna'];
  return { sections, decorations, renames: {} };
};

test('saves moved, resized and new rects', async (t) => {
  const edited = sampleLayout();
  edited.sections[0].rect = { x: 0, y: 20, w: 3, h: 3 }; // Warzywa moved and resized
  edited.sections.push({ name: 'Pieczywo', rect: { x: 30, y: 0, w: 4, h: 4 } });
  edited.decorations.push({ rect: { x: 30, y: 6, w: 4, h: 1 } });
  const session = editorSession(t, { answers: ['1'], pages: [edited] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.deepEqual(store.sections, edited.sections);
  assert.deepEqual(store.decorations, edited.decorations);
  assert.equal(store.products.pomidory, 'Warzywa');
  const { sections, decorations } = sampleLayout();
  assert.deepEqual(session.pageCalls[0].params.layout, { sections, decorations });
});

test('renamed sections take their products along, even when names are swapped', async (t) => {
  const edited = sampleLayout();
  edited.sections[0].name = 'Makarony';
  edited.sections[1].name = 'Warzywa';
  edited.sections[2].name = 'Nabiał i jajka';
  edited.renames = { Warzywa: 'Makarony', Makarony: 'Warzywa', Nabiał: 'Nabiał i jajka' };
  const data = sampleData();
  data.stores['Lidl Główna'].products.mleko = 'Nabiał';
  const session = editorSession(t, { data, answers: ['1'], pages: [edited] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.deepEqual(store.products, {
    makaron: 'Warzywa',
    mleko: 'Nabiał i jajka',
    passata: null,
    pomidory: 'Makarony',
  });
  assert.ok(session.output.includes('Renamed section "Nabiał" to "Nabiał i jajka".'));
});

test('decoration labels edited on the page are saved', async (t) => {
  const edited = sampleLayout();
  delete edited.decorations[0].label;
  edited.decorations[1].label = 'Wejście główne';
  const session = editorSession(t, { answers: ['1'], pages: [edited] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.deepEqual(store.decorations, edited.decorations);
});

test('a layout with rects too close together is not saved', async (t) => {
  const edited = sampleLayout();
  edited.sections[1].rect.x = 10; // touches Warzywa
  const session = editorSession(t, { answers: ['1'], pages: [edited] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  assert.equal(store.sections[1].rect.x, 12);
  assert.ok(session.output.some((line) => /closer than 1 unit/.test(line)));
});

test('cancelling in the browser changes nothing', async (t) => {
  const session = editorSession(t, { answers: ['1'], pages: [null] });
  await editLayout(session.ctx);
  const store = session.finish(assert).stores['Lidl Główna'];
  const { sections, decorations } = sampleLayout();
  assert.deepEqual({ sections: store.sections, decorations: store.decorations }, { sections, decorations });
  assert.ok(session.output.includes('Cancelled.'));
});
