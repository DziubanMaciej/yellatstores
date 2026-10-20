import { compareNames } from '../../../site/lib/normalize.js';
import { pickStore } from '../input.js';

// E6: go through the products not yet assigned in a store and put each into a section
// (typed by its id, as shown on the map) or mark it as not carried. Every answer is saved
// immediately.
export async function assignProducts(ctx) {
  const storeName = await pickStore(ctx);
  if (storeName === null) {
    return;
  }
  const store = () => ctx.data.stores[storeName];
  const unassigned = Object.keys(ctx.data.products)
    .filter((product) => !Object.hasOwn(store().products, product))
    .sort(compareNames);
  if (unassigned.length === 0) {
    ctx.io.print(`All products are already assigned in "${storeName}".`);
    return;
  }

  const sections = store().sections;
  const printSections = () => {
    ctx.io.print(`Sections of "${storeName}" (id, name):`);
    for (const section of sections) {
      ctx.io.print(`  ${section.id}) ${section.name}`);
    }
    ctx.io.print('  0) not in this store');
  };
  printSections();

  for (const [index, product] of unassigned.entries()) {
    for (;;) {
      const answer = await ctx.io.ask(
        `[${index + 1}/${unassigned.length}] ${product}: section id (s = skip, q = quit, ? = list):`,
      );
      if (answer === 'q') {
        return;
      }
      if (answer === 's') {
        break;
      }
      if (answer === '?') {
        printSections();
        continue;
      }
      const id = Number(answer);
      if (answer === '' || !(id === 0 || sections.some((section) => section.id === id))) {
        ctx.io.print('Invalid choice.');
        continue;
      }
      ctx.change((data) => {
        data.stores[storeName].products[product] = id === 0 ? null : id;
      });
      break;
    }
  }
  ctx.io.print(`Done with "${storeName}".`);
}
