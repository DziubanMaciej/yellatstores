// Static server for the site, laid out as deployed: site/ at /, data/ at /data/.

import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_DIR = fileURLToPath(new URL('../../site/', import.meta.url));
const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export function createSiteServer() {
  return http.createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }
    const [root, rest] = pathname.startsWith('/data/') ? [DATA_DIR, pathname.slice('/data/'.length)] : [SITE_DIR, pathname];
    const file = normalize(join(root, rest.endsWith('/') || rest === '' ? `${rest}index.html` : rest));
    if (req.method !== 'GET' || !file.startsWith(root.endsWith(sep) ? root : root + sep)) {
      res.writeHead(404).end('Not found');
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
}
