import { cleanName, splitNames } from '../input.js';

// E3: add products one after another until an empty name is entered.
export async function addProducts(ctx) {
  for (;;) {
    const name = cleanName(await ctx.io.ask('New product name (empty = done):'));
    if (name === '') {
      return;
    }
    if (Object.hasOwn(ctx.data.products, name)) {
      ctx.io.print(`Product "${name}" already exists.`);
      continue;
    }
    const aliases = splitNames(await ctx.io.ask('Aliases, comma-separated (empty = none):'));
    if (
      ctx.change((data) => {
        data.products[name] = { aliases };
      })
    ) {
      ctx.io.print(`Added product "${name}".`);
    }
  }
}
