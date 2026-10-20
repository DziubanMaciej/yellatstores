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
  assert.match(svg, /<g class="section" data-section="1">/);
  assert.doesNotMatch(svg, /section-id/);
  assert.match(svg, />Wejście<\/text>/);
});

const fontSizeOf = (svg, label) => Number(new RegExp(`font-size="([\\d.]+)"[^>]*>${label}<`).exec(svg)[1]);

test('labels rotate only when that lets them be bigger', () => {
  const layout = {
    sections: [
      { id: 1, name: 'Makarony i kasze', rect: { x: 0, y: 0, w: 2, h: 20 } },
      { id: 2, name: 'Ryby', rect: { x: 5, y: 0, w: 10, h: 12 } },
    ],
    decorations: [],
  };
  const svg = renderLayoutSvg(layout);
  assert.match(svg, /rotate\(-90 1 10\)">Makarony i kasze</);
  assert.doesNotMatch(svg, /rotate[^>]*>Ryby</);
});

test('labels fit inside their rect', () => {
  const layout = { sections: [{ id: 1, name: 'Bardzo długa nazwa działu', rect: { x: 0, y: 0, w: 10, h: 10 } }], decorations: [] };
  const fontSize = fontSizeOf(renderLayoutSvg(layout), 'Bardzo długa nazwa działu');
  // 25 characters at ~0.6 em each must fit in 90% of the 10-unit width.
  assert.ok(25 * 0.6 * fontSize <= 9 + 1e-9);
});

test('label size depends on the store, not on the zoom', () => {
  const zoomedIn = renderLayoutSvg(store(), { viewBox: { x: 0, y: 0, w: 10, h: 6 } });
  const zoomedOut = renderLayoutSvg(store(), { viewBox: { x: -100, y: -100, w: 300, h: 200 } });
  assert.equal(fontSizeOf(zoomedIn, 'Nabiał'), fontSizeOf(zoomedOut, 'Nabiał'));
});

test('renderLayoutSvg escapes names and accepts a custom view box', () => {
  const layout = { sections: [{ id: 1, name: 'A & <B>', rect: { x: 0, y: 0, w: 4, h: 2 } }], decorations: [] };
  const svg = renderLayoutSvg(layout, { viewBox: { x: -1, y: -1, w: 50, h: 30 } });
  assert.match(svg, />A &amp; &lt;B&gt;</);
  assert.match(svg, /viewBox="-1 -1 50 30"/);
});

test('section ids are drawn in the top-left corner only when asked (editor only)', () => {
  const svg = renderLayoutSvg(store(), { showIds: true });
  assert.equal(svg.match(/class="section-id"/g).length, 3);
  assert.match(svg, /<text class="section-id" x="[\d.]+" y="[\d.]+"[^>]*>2<\/text>/);
  const id = /<text class="section-id" x="([\d.]+)" y="([\d.]+)"[^>]*>3</.exec(svg);
  // Nabiał is at (0, 10): the id sits just inside its top-left corner.
  assert.ok(Number(id[1]) > 0 && Number(id[1]) < 1);
  assert.ok(Number(id[2]) > 10 && Number(id[2]) < 11);
});
