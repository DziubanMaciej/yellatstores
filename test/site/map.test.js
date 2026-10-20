import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_VIEW_BOX, fitViewBox, renderLayoutSvg } from '../../site/lib/map.js';
import { sampleData } from '../helpers/sample-data.js';

const store = () => sampleData().stores['Lidl Główna'];

test('fitViewBox encloses every rect with a margin', () => {
  const vb = fitViewBox(store());
  assert.ok(vb.x < 0 && vb.y < 0);
  assert.ok(vb.x + vb.w > 25 && vb.y + vb.h > 13);
});

test('fitViewBox falls back to a default area for an empty store', () => {
  assert.deepEqual(fitViewBox({ sections: [], decorations: [] }), EMPTY_VIEW_BOX);
});

test('renderLayoutSvg draws every section and decoration with labels', () => {
  const svg = renderLayoutSvg(store());
  assert.equal(svg.match(/<g class="section"/g).length, 3);
  assert.equal(svg.match(/<g class="decoration/g).length, 2);
  assert.match(svg, /<g class="decoration invisible">/);
  assert.match(svg, /data-section="Warzywa"/);
  assert.match(svg, />Wejście<\/text>/);
});

test('renderLayoutSvg rotates labels of tall rects', () => {
  const svg = renderLayoutSvg(store());
  assert.match(svg, /rotate\(-90 14 4\)">Makarony</);
});

test('renderLayoutSvg escapes names and draws an optional ghost rect', () => {
  const layout = { sections: [{ name: 'A & <B>', rect: { x: 0, y: 0, w: 4, h: 2 } }], decorations: [] };
  const svg = renderLayoutSvg(layout, { ghost: { x: 5, y: 5, w: 1, h: 1 } });
  assert.match(svg, />A &amp; &lt;B&gt;</);
  assert.match(svg, /<g class="ghost"><rect x="5" y="5"/);
});
