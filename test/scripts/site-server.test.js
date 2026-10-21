import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSiteServer } from '../../scripts/lib/site-server.js';

test('the local site server mirrors the deployed layout and serves nothing else', async (t) => {
  const server = createSiteServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path) => fetch(base + path);

  const index = await get('/');
  assert.equal(index.status, 200);
  assert.match(await index.text(), /<script type="module" src="app.js">/);
  const lib = await get('/lib/parse.js');
  assert.match(lib.headers.get('content-type'), /javascript/);
  const stores = await get('/data/stores.json');
  assert.match(stores.headers.get('content-type'), /json/);
  assert.equal(await stores.text(), readFileSync('data/stores.json', 'utf8'));

  for (const path of ['/missing.js', '/../package.json', '/%2e%2e/package.json', '/data/%2e%2e/package.json', '/%E0%A4%A']) {
    assert.ok([400, 404].includes((await get(path)).status), path);
  }
});
