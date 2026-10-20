import { pickStore } from '../input.js';

// E2: edit a store's layout in the browser: add, move, resize and rename rects.
// Nothing can be removed. Products assigned to a renamed section follow the new name.
export async function editLayout(ctx) {
  const storeName = await pickStore(ctx);
  if (storeName === null) {
    return;
  }
  const store = ctx.data.stores[storeName];
  const edited = await ctx.browser.drawLayout({
    title: `Layout of "${storeName}"`,
    layout: { sections: store.sections, decorations: store.decorations },
  });
  if (edited === null) {
    ctx.io.print('Cancelled.');
    return;
  }
  if (
    ctx.change((data) => {
      const changed = data.stores[storeName];
      changed.sections = edited.sections;
      changed.decorations = edited.decorations;
      // All renames apply at once, so swapping two names works too.
      for (const [product, section] of Object.entries(changed.products)) {
        if (section !== null && Object.hasOwn(edited.renames, section)) {
          changed.products[product] = edited.renames[section];
        }
      }
    })
  ) {
    for (const [from, to] of Object.entries(edited.renames)) {
      ctx.io.print(`Renamed section "${from}" to "${to}".`);
    }
    ctx.io.print('Layout saved.');
  }
}
