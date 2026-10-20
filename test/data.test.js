// Validates the real data in data/. If this fails after a hand edit, run the editor's
// "Validate data" command for details (it can also fix formatting).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA_DIR } from '../scripts/lib/data.js';
import { validateDir } from '../scripts/lib/validate.js';

test('real data in data/ is valid', () => {
  const errors = validateDir(DATA_DIR);
  assert.deepEqual(errors, [], `data/ has problems:\n${errors.join('\n')}`);
});
