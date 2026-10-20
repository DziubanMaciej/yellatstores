// State shared by editor commands: the loaded data, the user I/O and the browser pages.

import { loadData, saveData } from './data.js';
import { validateData } from './validate.js';

export function createContext({ dir, io, browser }) {
  const ctx = {
    dir,
    io,
    browser,
    data: loadData(dir),

    reload() {
      ctx.data = loadData(dir);
    },

    // Applies mutate() to a copy of the data. If the result is valid, it becomes the current
    // data and is saved; otherwise the errors are shown and nothing changes. Returns success.
    change(mutate) {
      const candidate = structuredClone(ctx.data);
      mutate(candidate);
      const errors = validateData(candidate);
      if (errors.length > 0) {
        io.print('Not saved:');
        for (const error of errors) {
          io.print(`  - ${error}`);
        }
        return false;
      }
      saveData(dir, candidate);
      ctx.data = candidate;
      return true;
    },
  };
  return ctx;
}
