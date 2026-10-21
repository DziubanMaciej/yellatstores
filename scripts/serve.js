// Serves the site locally, as deployed: node scripts/serve.js [port]
import { createSiteServer } from './lib/site-server.js';

const port = Number(process.argv[2] ?? 8000);
createSiteServer().listen(port, '127.0.0.1', () => {
  console.log(`Site at http://localhost:${port}/ (Ctrl+C to stop)`);
});
