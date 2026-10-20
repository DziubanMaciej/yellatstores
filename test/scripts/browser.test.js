import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
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
  const browser = createBrowser({ open: fakePage({ sections: [], decorations: [] }, seen), port: 0 });
  const params = { title: 'T', layout: { sections: [], decorations: [] } };
  const result = await browser.drawLayout(params);
  assert.deepEqual(result, { sections: [], decorations: [] });
  assert.match(seen.html, /<script type="module" src="draw.js">/);
  assert.equal(seen.module.status, 200);
  assert.match(seen.module.headers.get('content-type'), /javascript/);
  assert.equal(seen.missing.status, 404);
  assert.deepEqual(seen.params, params);
});

test('a cancelled page resolves with null', async () => {
  const browser = createBrowser({ open: fakePage(null, {}), port: 0 });
  assert.equal(await browser.showStore({ title: 'T', svg: '', groups: [] }), null);
});

// Plays a page that is cancelled right away, recording the port it was served on.
function cancellingPage(ports) {
  return async (url) => {
    ports.push(Number(new URL(url).port));
    await fetch(new URL('/api/result', url), { method: 'POST', body: 'null' });
  };
}

test('pages use the same fixed port every time', async () => {
  const ports = [];
  const browser = createBrowser({ open: cancellingPage(ports), port: 18765 });
  await browser.showStore({});
  await browser.drawLayout({});
  assert.deepEqual(ports, [18765, 18765]);
});

test('a taken port falls back to the next one', async (t) => {
  const blocker = createServer();
  await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve));
  t.after(() => blocker.close());
  const taken = blocker.address().port;
  const ports = [];
  await createBrowser({ open: cancellingPage(ports), port: taken }).showStore({});
  assert.equal(ports[0], taken + 1);
});
