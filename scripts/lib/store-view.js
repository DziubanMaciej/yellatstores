// What the "View store" page shows: the map plus all products grouped by section.

import { renderLayoutSvg } from '../../site/lib/map.js';
import { compareNames } from '../../site/lib/normalize.js';

export function buildStoreView(data, storeName) {
  const store = data.stores[storeName];
  const sectionGroups = new Map(store.sections.map((section) => [section.id, []]));
  const notCarried = [];
  const unassigned = [];
  for (const product of Object.keys(data.products).sort(compareNames)) {
    if (!Object.hasOwn(store.products, product)) {
      unassigned.push(product);
    } else if (store.products[product] === null) {
      notCarried.push(product);
    } else {
      sectionGroups.get(store.products[product]).push(product);
    }
  }

  const groups = store.sections.map((section) => ({
    section: section.id,
    title: `${section.id}) ${section.name}`,
    items: sectionGroups.get(section.id),
  }));
  if (notCarried.length > 0) {
    groups.push({ title: 'Not in this store', items: notCarried });
  }
  if (unassigned.length > 0) {
    groups.push({ title: 'Unassigned', items: unassigned });
  }
  return { title: storeName, svg: renderLayoutSvg(store, { showIds: true }), groups };
}
