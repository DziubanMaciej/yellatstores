import { cleanName } from '../input.js';

// E1: name a new store, then draw its sections and decorations in the browser.
export async function createStore(ctx) {
  let name;
  for (;;) {
    name = cleanName(await ctx.io.ask('New store name (empty = cancel):'));
    if (name === '') {
      return;
    }
    if (!Object.hasOwn(ctx.data.stores, name)) {
      break;
    }
    ctx.io.print(`Store "${name}" already exists.`);
  }

  const drawn = await ctx.browser.drawLayout({
    title: `New store "${name}"`,
    layout: { sections: [], decorations: [] },
    ghost: null,
    target: null,
  });
  if (drawn === null) {
    ctx.io.print('Cancelled.');
    return;
  }
  if (
    ctx.change((data) => {
      data.stores[name] = { sections: drawn.sections, decorations: drawn.decorations, products: {} };
    })
  ) {
    ctx.io.print(
      `Created store "${name}" with ${drawn.sections.length} section(s) and ${drawn.decorations.length} decoration(s).`,
    );
  }
}
