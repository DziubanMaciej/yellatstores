// Runs editor commands without a terminal or browser: answers come from a script,
// browser pages from a queue of predefined results, data from a temp directory.

import { createContext } from '../../scripts/lib/context.js';
import { createIo } from '../../scripts/lib/io.js';
import { validateDir } from '../../scripts/lib/validate.js';
import { sampleData, tempDataDir } from './sample-data.js';

// answers: what the user types, in order.
// pages: results the browser pages return, in order (drawLayout/showStore calls).
export function editorSession(t, { answers = [], pages = [], data = sampleData() } = {}) {
  const { dir, cleanup } = tempDataDir(data);
  t.after(cleanup);

  const queue = [...answers];
  const output = [];
  const io = createIo({
    readLine: async (prompt) => {
      output.push(prompt);
      if (queue.length === 0) {
        throw new Error(`No scripted answer left for prompt: ${prompt}`);
      }
      return queue.shift();
    },
    write: (text) => output.push(text),
  });

  const pageQueue = [...pages];
  const pageCalls = [];
  const page = (kind) => async (params) => {
    pageCalls.push({ kind, params });
    if (pageQueue.length === 0) {
      throw new Error(`No scripted page result left for ${kind}`);
    }
    return pageQueue.shift();
  };
  const browser = { drawLayout: page('drawLayout'), showStore: page('showStore') };

  const ctx = createContext({ dir, io, browser });
  return {
    ctx,
    dir,
    output,
    pageCalls,
    // Asserts the whole script was used and returns the data now on disk, after validating it.
    finish(assert) {
      assert.deepEqual(queue, [], 'unused scripted answers');
      assert.deepEqual(pageQueue, [], 'unused scripted page results');
      assert.deepEqual(validateDir(dir), [], 'data on disk is invalid');
      return createContext({ dir, io, browser }).data;
    },
  };
}
