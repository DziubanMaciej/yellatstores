import { renderLayoutSvg } from '../../../site/lib/map.js';
import { compareNames } from '../../../site/lib/normalize.js';
import { pickStore } from '../input.js';

// E6: a browser page shows the products not yet assigned in a store, one at a time; clicking a
// section on the map (or "Not in this store") assigns it. Every answer is saved immediately.
export async function assignProducts(ctx) {
  const storeName = await pickStore(ctx);
  if (storeName === null) {
    return;
  }
  const store = ctx.data.stores[storeName];
  const products = Object.keys(ctx.data.products)
    .filter((product) => !Object.hasOwn(store.products, product))
    .sort(compareNames);
  if (products.length === 0) {
    ctx.io.print(`All products are already assigned in "${storeName}".`);
    return;
  }

  const sectionIds = new Set(store.sections.map((section) => section.id));
  // Messages from the page: { product, section: id | null } or { product, unassign: true }.
  const onMessage = (message) => {
    if (!products.includes(message.product)) {
      return { error: `Unknown product "${message.product}".` };
    }
    if (!message.unassign && message.section !== null && !sectionIds.has(message.section)) {
      return { error: `Unknown section id ${message.section}.` };
    }
    const saved = ctx.change((data) => {
      const assigned = data.stores[storeName].products;
      if (message.unassign) {
        delete assigned[message.product];
      } else {
        assigned[message.product] = message.section;
      }
    });
    return saved ? { ok: true } : { error: 'Not saved, see the terminal.' };
  };

  await ctx.browser.assignProducts(
    {
      title: `Assign products in "${storeName}"`,
      svg: renderLayoutSvg(store, { showIds: true }),
      sections: store.sections.map(({ id, name }) => ({ id, name })),
      products,
    },
    onMessage,
  );
  const left = products.filter((product) => !Object.hasOwn(ctx.data.stores[storeName].products, product));
  ctx.io.print(`Done with "${storeName}". Still unassigned: ${left.length}.`);
}
