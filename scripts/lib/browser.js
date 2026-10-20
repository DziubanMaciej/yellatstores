// Opens editor pages (scripts/web/) in the browser through a short-lived local HTTP server.
// The page fetches its input from GET /api/params and finishes with POST /api/result;
// the posted JSON becomes the result of the call and the server shuts down.

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const WEB_DIR = fileURLToPath(new URL('../web/', import.meta.url));
const SITE_LIB_DIR = fileURLToPath(new URL('../../site/lib/', import.meta.url));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

// open(url) shows the page; tests replace it with code that plays the page's part.
export function createBrowser({ open = openInSystemBrowser } = {}) {
  return {
    // params: { title, layout: { sections, decorations } } (see scripts/web/draw.js)
    // Resolves to the whole edited layout { sections, decorations }, or null when cancelled.
    drawLayout: (params) => runPage('draw.html', params, open),
    // params: buildStoreView() output. Resolves when the page is closed.
    showStore: (params) => runPage('view.html', params, open),
  };
}

export function runPage(page, params, open) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const { pathname } = new URL(req.url, 'http://localhost');
        if (req.method === 'GET' && pathname === '/api/params') {
          sendJson(res, params);
        } else if (req.method === 'POST' && pathname === '/api/result') {
          const result = JSON.parse(await readBody(req));
          res.on('finish', () => server.close());
          sendJson(res, { ok: true });
          resolve(result);
        } else if (req.method === 'GET') {
          await sendStatic(res, pathname);
        } else {
          res.writeHead(405).end();
        }
      } catch (e) {
        res.writeHead(500).end(String(e));
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      open(`http://127.0.0.1:${server.address().port}/${page}`);
    });
  });
}

// Serves /<file> from scripts/web/ and /site/lib/<file> from site/lib/, nothing else.
// With this layout, relative imports like '../../site/lib/map.js' in scripts/web/ resolve
// the same way in the browser and in Node tests.
async function sendStatic(res, pathname) {
  const match = /^\/(site\/lib\/)?([\w-]+(\.html|\.js|\.css))$/.exec(pathname);
  if (match === null) {
    res.writeHead(404).end('Not found');
    return;
  }
  const dir = match[1] ? SITE_LIB_DIR : WEB_DIR;
  let body;
  try {
    body = await readFile(dir + match[2]);
  } catch {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, { 'content-type': CONTENT_TYPES[match[3]], 'cache-control': 'no-store' });
  res.end(body);
}

function sendJson(res, value) {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  return body;
}

function openInSystemBrowser(url) {
  console.log(`Opening ${url} in the browser. Waiting for you to finish there...`);
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}
