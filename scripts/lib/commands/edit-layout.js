import { pickStore } from '../input.js';

// E2: edit a store's layout in the browser: add, move, resize and rename rects.
// Nothing can be removed. Products are assigned by section id, so renames don't affect them.
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
      data.stores[storeName].sections = edited.sections;
      data.stores[storeName].decorations = edited.decorations;
    })
  ) {
    ctx.io.print('Layout saved.');
  }
}
