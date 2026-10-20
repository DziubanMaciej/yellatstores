// Interactive editor for data/. Run: node scripts/edit.js

import { createBrowser } from './lib/browser.js';
import { createContext } from './lib/context.js';
import { DATA_DIR } from './lib/data.js';
import { createTerminalIo } from './lib/io.js';
import { runMenu } from './lib/menu.js';
import { validateDir } from './lib/validate.js';

const io = createTerminalIo();
let ctx;
try {
  ctx = createContext({ dir: DATA_DIR, io, browser: createBrowser() });
} catch (e) {
  io.print(`Cannot load data: ${e.message}`);
  io.close();
  process.exit(1);
}

io.print('YellAtStores editor');
const problems = validateDir(DATA_DIR).length;
if (problems > 0) {
  io.print(`Warning: data/ has ${problems} problem(s). Run "Validate data" for details.`);
}
await runMenu(ctx);
io.close();
