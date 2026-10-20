import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkItem,
  drawingArea,
  findCollisions,
  itemsFromLayout,
  layoutFromItems,
  movedRect,
  resizedRect,
  nextSectionId,
  zoomedArea,
} from '../../scripts/web/draw-model.js';
import { sampleData } from '../helpers/sample-data.js';

const layout = () => {
  const { sections, decorations } = sampleData().stores['Lidl Główna'];
  return { sections, decorations };
};
const rect = (x, y, w, h) => ({ x, y, w, h });

test('drawing area covers the layout with room to spare', () => {
  const area = drawingArea(layout());
  assert.ok(area.x <= -5 && area.y <= -5);
  assert.ok(area.x + area.w >= 30 && area.y + area.h >= 18);
});

test('drawing area for an empty store is the default area', () => {
  assert.deepEqual(drawingArea({ sections: [], decorations: [] }), { x: 0, y: 0, w: 100, h: 60 });
});

test('items convert back to the same layout, new items appended per kind', () => {
  const items = itemsFromLayout(layout());
  assert.deepEqual(layoutFromItems(items), layout());
  items.push({ kind: 'decoration', label: undefined, visible: true, rect: rect(40, 0, 1, 1) });
  items.push({ kind: 'section', id: 4, name: 'Pieczywo', rect: rect(40, 5, 1, 1) });
  const result = layoutFromItems(items);
  assert.deepEqual(result.sections.at(-1), { id: 4, name: 'Pieczywo', rect: rect(40, 5, 1, 1) });
  assert.deepEqual(result.decorations.at(-1), { rect: rect(40, 0, 1, 1) });
  assert.deepEqual(result.decorations[1], { rect: rect(20, 10, 5, 2), label: 'Wejście', visible: false });
});

test('new items are checked for size and names, not for distance', () => {
  const items = itemsFromLayout(layout());
  const check = (item) => checkItem(item, items);
  assert.equal(check({ kind: 'section', name: 'Pieczywo', rect: rect(10, 0, 5, 5) }), null);
  assert.match(check({ kind: 'section', name: 'X', rect: rect(30, 0, 0, 5) }), /Too small/);
  assert.match(check({ kind: 'section', name: '', rect: rect(30, 0, 5, 5) }), /Type a section name/);
  assert.match(check({ kind: 'section', name: 'NABIAŁ', rect: rect(30, 0, 5, 5) }), /already is a section "NABIAŁ"/);
  assert.match(check({ kind: 'decoration', visible: false, rect: rect(30, 0, 2, 2) }), /needs a label/);
  assert.equal(check({ kind: 'decoration', visible: true, rect: rect(30, 0, 2, 2) }), null);
});

test('findCollisions marks every rect that is too close to another', () => {
  const items = itemsFromLayout(layout());
  assert.deepEqual(findCollisions(items), new Set());
  items[1].rect = rect(10.5, 0, 4, 8); // Makarony 0.5 from Warzywa
  assert.deepEqual(findCollisions(items), new Set([0, 1]));
});

test('movedRect moves by whole units', () => {
  assert.deepEqual(movedRect(rect(2, 3, 4, 5), 1.4, -2.6), rect(3, 0, 4, 5));
});

test('resizedRect keeps the opposite corner and a minimum size of 1', () => {
  const r = rect(10, 10, 4, 4);
  assert.deepEqual(resizedRect(r, 'se', { x: 20.2, y: 16 }), rect(10, 10, 10, 6));
  assert.deepEqual(resizedRect(r, 'nw', { x: 8, y: 12 }), rect(8, 12, 6, 2));
  assert.deepEqual(resizedRect(r, 'ne', { x: 10, y: 14 }), rect(10, 14, 1, 1));
  // Dragging past the fixed corner flips the rect instead of making it negative.
  assert.deepEqual(resizedRect(r, 'sw', { x: 16, y: 12 }), rect(14, 10, 2, 2));
});

test('an edited item may keep its own name but not take another section name', () => {
  const items = itemsFromLayout(layout());
  assert.equal(checkItem({ ...items[0], name: 'Warzywa' }, items, 0), null);
  assert.equal(checkItem({ ...items[0], name: 'Warzywa i owoce' }, items, 0), null);
  assert.match(checkItem({ ...items[0], name: 'makarony' }, items, 0), /already is a section/);
});

test('nextSectionId is one more than the highest id, ignoring gaps', () => {
  assert.equal(nextSectionId([]), 1);
  const items = itemsFromLayout(layout());
  assert.equal(nextSectionId(items), 4);
  items[1].id = 10;
  assert.equal(nextSectionId(items), 11);
});

test('zoomedArea scales around the given point and keeps it in place', () => {
  const area = rect(0, 0, 100, 60);
  const zoomedIn = zoomedArea(area, 0.5, { x: 40, y: 30 });
  assert.deepEqual(zoomedIn, rect(20, 15, 50, 30));
  // The point keeps its relative position: 40% across, 50% down.
  assert.equal((40 - zoomedIn.x) / zoomedIn.w, 0.4);
  assert.deepEqual(zoomedArea(zoomedIn, 2, { x: 40, y: 30 }), area);
});

test('zoomedArea stops at the zoom limits', () => {
  const tiny = rect(0, 0, 6, 4);
  assert.equal(zoomedArea(tiny, 0.5, { x: 0, y: 0 }), tiny);
  const huge = rect(0, 0, 4800, 3000);
  assert.equal(zoomedArea(huge, 1.15, { x: 0, y: 0 }), huge);
});
