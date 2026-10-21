// Serves the site locally, as deployed: node scripts/serve.js [--lan] [port]
// --lan also accepts connections from other devices on the local network (e.g. a phone).
import { networkInterfaces } from 'node:os';
import { createSiteServer } from './lib/site-server.js';

const args = process.argv.slice(2);
const lan = args.includes('--lan');
const port = Number(args.find((a) => a !== '--lan') ?? 8000);

createSiteServer().listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`Site at http://localhost:${port}/ (Ctrl+C to stop)`);
  if (!lan) return;
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs) {
      if (a.family === 'IPv4' && !a.internal) console.log(`      and http://${a.address}:${port}/`);
    }
  }
});
