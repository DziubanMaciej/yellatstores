import { findByName, splitNames } from '../input.js';

// E4: add aliases to products or recipes, found by any of their names.
export async function addAliases(ctx) {
  for (;;) {
    const text = await ctx.io.ask('Product or recipe to extend (name or alias, empty = done):');
    if (text === '') {
      return;
    }
    const found = findByName(ctx.data, text);
    if (found === null) {
      ctx.io.print(`No product or recipe matches "${text}".`);
      continue;
    }
    const collection = found.kind === 'product' ? 'products' : 'recipes';
    const current = ctx.data[collection][found.name].aliases;
    ctx.io.print(`${found.kind} "${found.name}", aliases: ${current.length > 0 ? current.join(', ') : '(none)'}`);

    const aliases = splitNames(await ctx.io.ask('New aliases, comma-separated (empty = none):'));
    if (aliases.length === 0) {
      continue;
    }
    if (
      ctx.change((data) => {
        data[collection][found.name].aliases.push(...aliases);
      })
    ) {
      ctx.io.print(`Added ${aliases.length} alias(es) to "${found.name}".`);
    }
  }
}
