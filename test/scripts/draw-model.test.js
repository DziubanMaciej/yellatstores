import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNewItem, drawingArea, toDecoration } from '../../scripts/web/draw-model.js';
import { sampleData } from '../helpers/sample-data.js';

const layout = () => sampleData().stores['Lidl Główna'];
const rect = (x, y, w, h) => ({ x, y, w, h });

test('drawing area covers the layout and the ghost with room to spare', () => {
  const area = drawingArea(layout(), rect(40, 40, 2, 2));
  assert.ok(area.x <= -5 && area.y <= -5);
  assert.ok(area.x + area.w >= 47 && area.y + area.h >= 47);
});

test('drawing area for an empty store is the default area', () => {
  assert.deepEqual(drawingArea({ sections: [], decorations: [] }, null), { x: 0, y: 0, w: 100, h: 60 });
});

test('a valid new section is accepted', () => {
  assert.equal(checkNewItem({ kind: 'section', name: 'Pieczywo', rect: rect(30, 0, 5, 5) }, layout()), null);
});

test('new items are checked for size, names and distance to everything', () => {
  const check = (item) => checkNewItem(item, layout());
  assert.match(check({ kind: 'section', name: 'X', rect: rect(30, 0, 0, 5) }), /Too small/);
  assert.match(check({ kind: 'section', name: '', rect: rect(30, 0, 5, 5) }), /Type a section name/);
  assert.match(check({ kind: 'section', name: 'NABIAŁ', rect: rect(30, 0, 5, 5) }), /already is a section "NABIAŁ"/);
  assert.match(check({ kind: 'section', name: 'X', rect: rect(10, 0, 1, 1) }), /Too close to section "Warzywa"/);
  assert.match(check({ kind: 'decoration', rect: rect(25, 0, 2, 2) }), /Too close to decoration "Kasy"/);
  assert.match(check({ kind: 'decoration', visible: false, rect: rect(30, 0, 2, 2) }), /needs a label/);
});

test('drawn decorations convert to the stores.json form', () => {
  assert.deepEqual(toDecoration({ kind: 'decoration', label: undefined, visible: true, rect: rect(0, 0, 1, 1) }), {
    rect: rect(0, 0, 1, 1),
  });
  assert.deepEqual(toDecoration({ kind: 'decoration', label: 'Kasy', visible: false, rect: rect(0, 0, 1, 1) }), {
    rect: rect(0, 0, 1, 1),
    label: 'Kasy',
    visible: false,
  });
});
