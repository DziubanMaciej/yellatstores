import { compareNames } from '../../../site/lib/normalize.js';
import { pickStore } from '../input.js';

// E6: go through the products not yet assigned in a store and put each into a section
// or mark it as not carried. Every answer is saved immediately.
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

  const sections = store().sections.map((section) => section.name);
  const printSections = () => {
    ctx.io.print(`Sections of "${storeName}":`);
    sections.forEach((name, index) => ctx.io.print(`  ${index + 1}) ${name}`));
    ctx.io.print('  0) not in this store');
  };
  printSections();

  for (const [index, product] of unassigned.entries()) {
    for (;;) {
      const answer = await ctx.io.ask(
        `[${index + 1}/${unassigned.length}] ${product}: section number (s = skip, q = quit, ? = list):`,
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
      const number = Number(answer);
      if (answer === '' || !Number.isInteger(number) || number < 0 || number > sections.length) {
        ctx.io.print('Invalid choice.');
        continue;
      }
      const section = number === 0 ? null : sections[number - 1];
      ctx.change((data) => {
        data.stores[storeName].products[product] = section;
      });
      break;
    }
  }
  ctx.io.print(`Done with "${storeName}".`);
}
