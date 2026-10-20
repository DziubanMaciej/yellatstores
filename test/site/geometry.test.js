import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundsOf, rectFromPoints, rectGap, tooClose } from '../../site/lib/geometry.js';

const rect = (x, y, w, h) => ({ x, y, w, h });

test('rectGap measures horizontal and vertical separation', () => {
  assert.equal(rectGap(rect(0, 0, 10, 10), rect(13, 0, 5, 5)), 3);
  assert.equal(rectGap(rect(0, 0, 10, 10), rect(0, 12, 5, 5)), 2);
  // Diagonal: separated on both axes, the larger gap counts.
  assert.equal(rectGap(rect(0, 0, 10, 10), rect(11, 14, 5, 5)), 4);
});

test('tooClose rejects overlapping, touching and sub-unit gaps', () => {
  assert.equal(tooClose(rect(0, 0, 10, 10), rect(5, 5, 10, 10)), true);
  assert.equal(tooClose(rect(0, 0, 10, 10), rect(10, 0, 5, 5)), true);
  assert.equal(tooClose(rect(0, 0, 10, 10), rect(10.5, 0, 5, 5)), true);
  assert.equal(tooClose(rect(0, 0, 10, 10), rect(11, 0, 5, 5)), false);
});

test('rectFromPoints normalises drag direction and rounds to whole units', () => {
  assert.deepEqual(rectFromPoints({ x: 10.4, y: 8.6 }, { x: 2.2, y: 1.4 }), rect(2, 1, 8, 8));
});

test('boundsOf returns the enclosing rect, or null for nothing', () => {
  assert.equal(boundsOf([]), null);
  assert.deepEqual(boundsOf([rect(0, 0, 2, 2), rect(5, -3, 1, 1)]), rect(0, -3, 6, 5));
});
