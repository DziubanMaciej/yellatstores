import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBrowser } from '../../scripts/lib/browser.js';

// Plays the page's part: loads it, fetches params, posts a result.
function fakePage(result, seen) {
  return async (url) => {
    const base = new URL(url).origin;
    seen.html = await (await fetch(url)).text();
    seen.module = await fetch(`${base}/site/lib/map.js`);
    seen.missing = await fetch(`${base}/../package.json`);
    seen.params = await (await fetch(`${base}/api/params`)).json();
    await fetch(`${base}/api/result`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(result),
    });
  };
}

test('drawLayout serves the page and params and resolves with the posted result', async () => {
  const seen = {};
  const browser = createBrowser({ open: fakePage({ rect: { x: 1, y: 2, w: 3, h: 4 } }, seen) });
  const params = { title: 'T', layout: { sections: [], decorations: [] }, ghost: null, target: null };
  const result = await browser.drawLayout(params);
  assert.deepEqual(result, { rect: { x: 1, y: 2, w: 3, h: 4 } });
  assert.match(seen.html, /<script type="module" src="draw.js">/);
  assert.equal(seen.module.status, 200);
  assert.match(seen.module.headers.get('content-type'), /javascript/);
  assert.equal(seen.missing.status, 404);
  assert.deepEqual(seen.params, params);
});

test('a cancelled page resolves with null', async () => {
  const browser = createBrowser({ open: fakePage(null, {}) });
  assert.equal(await browser.showStore({ title: 'T', svg: '', groups: [] }), null);
});
