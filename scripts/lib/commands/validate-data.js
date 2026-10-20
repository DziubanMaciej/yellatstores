import { loadData, saveData } from '../data.js';
import { isFormatError, validateDir } from '../validate.js';

// E8: check data/ on disk. If formatting is the only problem (e.g. after a hand edit),
// offer to rewrite the files in canonical form.
export async function validateDataCommand(ctx) {
  const errors = validateDir(ctx.dir);
  if (errors.length === 0) {
    ctx.io.print('Data is valid.');
    return;
  }
  ctx.io.print(`Found ${errors.length} problem(s):`);
  for (const error of errors) {
    ctx.io.print(`  - ${error}`);
  }
  if (errors.every(isFormatError) && (await ctx.io.confirm('Reformat the files?'))) {
    saveData(ctx.dir, loadData(ctx.dir));
    ctx.reload();
    ctx.io.print('Reformatted.');
  }
}
