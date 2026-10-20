import { cleanName, pickStore } from '../input.js';

const ACTIONS = [
  'Add sections or decorations',
  'Redraw a section',
  'Redraw a decoration',
  'Rename a section',
  'Change a decoration label',
];

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
    await [addItems, redrawSection, redrawDecoration, renameSection, relabelDecoration][action](ctx, storeName);
  }
}

async function addItems(ctx, storeName) {
  const store = ctx.data.stores[storeName];
  const drawn = await ctx.browser.drawLayout({
    title: `Add to "${storeName}"`,
    layout: { sections: store.sections, decorations: store.decorations },
    ghost: null,
    target: null,
  });
  if (drawn === null) {
    ctx.io.print('Cancelled.');
    return;
  }
  if (
    ctx.change((data) => {
      data.stores[storeName].sections.push(...drawn.sections);
      data.stores[storeName].decorations.push(...drawn.decorations);
    })
  ) {
    ctx.io.print(`Added ${drawn.sections.length} section(s) and ${drawn.decorations.length} decoration(s).`);
  }
}

async function redrawSection(ctx, storeName) {
  const store = ctx.data.stores[storeName];
  const index = await chooseSection(ctx, store);
  if (index === null) {
    return;
  }
  const section = store.sections[index];
  const drawn = await ctx.browser.drawLayout({
    title: `Redraw section "${section.name}" in "${storeName}"`,
    layout: { sections: store.sections.filter((_, i) => i !== index), decorations: store.decorations },
    ghost: section.rect,
    target: { kind: 'section', name: section.name },
  });
  if (drawn === null) {
    ctx.io.print('Cancelled.');
    return;
  }
  if (
    ctx.change((data) => {
      data.stores[storeName].sections[index].rect = drawn.rect;
    })
  ) {
    ctx.io.print(`Redrew section "${section.name}".`);
  }
}

async function redrawDecoration(ctx, storeName) {
  const store = ctx.data.stores[storeName];
  const index = await chooseDecoration(ctx, store);
  if (index === null) {
    return;
  }
  const decoration = store.decorations[index];
  const drawn = await ctx.browser.drawLayout({
    title: `Redraw decoration ${decorationTitle(decoration, index)} in "${storeName}"`,
    layout: { sections: store.sections, decorations: store.decorations.filter((_, i) => i !== index) },
    ghost: decoration.rect,
    target: { kind: 'decoration', label: decoration.label, visible: decoration.visible },
  });
  if (drawn === null) {
    ctx.io.print('Cancelled.');
    return;
  }
  if (
    ctx.change((data) => {
      data.stores[storeName].decorations[index].rect = drawn.rect;
    })
  ) {
    ctx.io.print(`Redrew decoration ${decorationTitle(decoration, index)}.`);
  }
}

async function renameSection(ctx, storeName) {
  const index = await chooseSection(ctx, ctx.data.stores[storeName]);
  if (index === null) {
    return;
  }
  const oldName = ctx.data.stores[storeName].sections[index].name;
  const newName = cleanName(await ctx.io.ask(`New name for "${oldName}" (empty = keep):`));
  if (newName === '' || newName === oldName) {
    return;
  }
  if (
    ctx.change((data) => {
      const store = data.stores[storeName];
      store.sections[index].name = newName;
      for (const [product, section] of Object.entries(store.products)) {
        if (section === oldName) {
          store.products[product] = newName;
        }
      }
    })
  ) {
    ctx.io.print(`Renamed section "${oldName}" to "${newName}".`);
  }
}

async function relabelDecoration(ctx, storeName) {
  const store = ctx.data.stores[storeName];
  const index = await chooseDecoration(ctx, store);
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

async function chooseSection(ctx, store) {
  if (store.sections.length === 0) {
    ctx.io.print('This store has no sections.');
    return null;
  }
  return ctx.io.choose(
    'Section:',
    store.sections.map((section) => section.name),
  );
}

async function chooseDecoration(ctx, store) {
  if (store.decorations.length === 0) {
    ctx.io.print('This store has no decorations.');
    return null;
  }
  return ctx.io.choose('Decoration:', store.decorations.map(decorationTitle));
}

function decorationTitle(decoration, index) {
  const name = decoration.label === undefined ? `#${index + 1} (no label)` : `"${decoration.label}"`;
  return decoration.visible === false ? `${name} (text only)` : name;
}
