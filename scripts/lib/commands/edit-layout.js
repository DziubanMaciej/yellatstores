import { cleanName, pickStore } from '../input.js';

const ACTIONS = ['Edit layout in browser (add, move, resize)', 'Rename a section', 'Change a decoration label'];

// E2: change the layout of an existing store. Nothing can be removed.
export async function editLayout(ctx) {
  const storeName = await pickStore(ctx);
  if (storeName === null) {
    return;
  }
  for (;;) {
    const action = await ctx.io.choose(`Edit layout of "${storeName}":`, ACTIONS);
    if (action === null) {
      return;
    }
    await [editInBrowser, renameSection, relabelDecoration][action](ctx, storeName);
  }
}

async function editInBrowser(ctx, storeName) {
  const store = ctx.data.stores[storeName];
  const layout = await ctx.browser.drawLayout({
    title: `Layout of "${storeName}"`,
    layout: { sections: store.sections, decorations: store.decorations },
  });
  if (layout === null) {
    ctx.io.print('Cancelled.');
    return;
  }
  if (
    ctx.change((data) => {
      data.stores[storeName].sections = layout.sections;
      data.stores[storeName].decorations = layout.decorations;
    })
  ) {
    ctx.io.print('Layout saved.');
  }
}

async function renameSection(ctx, storeName) {
  const store = ctx.data.stores[storeName];
  if (store.sections.length === 0) {
    ctx.io.print('This store has no sections.');
    return;
  }
  const index = await ctx.io.choose(
    'Section:',
    store.sections.map((section) => section.name),
  );
  if (index === null) {
    return;
  }
  const oldName = store.sections[index].name;
  const newName = cleanName(await ctx.io.ask(`New name for "${oldName}" (empty = keep):`));
  if (newName === '' || newName === oldName) {
    return;
  }
  if (
    ctx.change((data) => {
      const changed = data.stores[storeName];
      changed.sections[index].name = newName;
      for (const [product, section] of Object.entries(changed.products)) {
        if (section === oldName) {
          changed.products[product] = newName;
        }
      }
    })
  ) {
    ctx.io.print(`Renamed section "${oldName}" to "${newName}".`);
  }
}

async function relabelDecoration(ctx, storeName) {
  const store = ctx.data.stores[storeName];
  if (store.decorations.length === 0) {
    ctx.io.print('This store has no decorations.');
    return;
  }
  const index = await ctx.io.choose('Decoration:', store.decorations.map(decorationTitle));
  if (index === null) {
    return;
  }
  const label = cleanName(await ctx.io.ask('New label (empty = no label):'));
  if (
    ctx.change((data) => {
      const decoration = data.stores[storeName].decorations[index];
      if (label === '') {
        delete decoration.label;
      } else {
        decoration.label = label;
      }
    })
  ) {
    ctx.io.print('Label changed.');
  }
}

function decorationTitle(decoration, index) {
  const name = decoration.label === undefined ? `#${index + 1} (no label)` : `"${decoration.label}"`;
  return decoration.visible === false ? `${name} (text only)` : name;
}
