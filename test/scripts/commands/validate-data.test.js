import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateDataCommand } from '../../../scripts/lib/commands/validate-data.js';
import { editorSession } from '../../helpers/editor.js';
import { sampleData } from '../../helpers/sample-data.js';

test('reports valid data', async (t) => {
  const session = editorSession(t);
  await validateDataCommand(session.ctx);
  session.finish(assert);
  assert.ok(session.output.includes('Data is valid.'));
});

test('offers to reformat hand-edited files and does it', async (t) => {
  const session = editorSession(t, { answers: ['y'] });
  writeFileSync(join(session.dir, 'products.json'), JSON.stringify(sampleData().products));
  await validateDataCommand(session.ctx);
  session.finish(assert);
  assert.ok(session.output.includes('Reformatted.'));
});

test('lists real problems without offering to reformat', async (t) => {
  const session = editorSession(t);
  const data = sampleData();
  data.stores['Lidl Główna'].products.chleb = null;
  writeFileSync(join(session.dir, 'stores.json'), JSON.stringify(data.stores));
  await validateDataCommand(session.ctx);
  assert.ok(session.output.some((line) => /product "chleb" is not in products\.json/.test(line)));
});
