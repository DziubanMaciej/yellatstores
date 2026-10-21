// Steps 4-6 of the pipeline: match entries to products, merge duplicates, and find each
// product's place in a store.

import { normalize } from './normalize.js';

// entries: expandRecipes() results. Returns items in order of first appearance:
//   { product: canonical name | null, name: shown name, notes }
// Entries of the same product become one item with all their notes, in order. Unmatched
// entries are never merged and keep the name as typed.
export function resolveEntries(entries, products) {
  const byName = new Map();
  for (const [name, product] of Object.entries(products)) {
    for (const form of [name, ...product.aliases]) {
      byName.set(normalize(form), name);
    }
  }
  const items = [];
  const itemOf = new Map();
  for (const entry of entries) {
    const product = byName.get(normalize(entry.name)) ?? null;
    if (product !== null && itemOf.has(product)) {
      itemOf.get(product).notes.push(...entry.notes);
      continue;
    }
    const item = { product, name: product ?? entry.name, notes: [...entry.notes] };
    items.push(item);
    if (product !== null) {
      itemOf.set(product, item);
    }
  }
  return items;
}

export const UNKNOWN_PRODUCT = 'nieznany produkt';
export const NOT_ASSIGNED = 'nieprzypisany w tym sklepie';
export const NOT_IN_STORE = 'nie ma w tym sklepie';

// { section: id } when the store has the product in a section, otherwise { unknown: reason }.
export function locate(item, store) {
  if (item.product === null) {
    return { unknown: UNKNOWN_PRODUCT };
  }
  if (!Object.hasOwn(store.products, item.product)) {
    return { unknown: NOT_ASSIGNED };
  }
  const section = store.products[item.product];
  return section === null ? { unknown: NOT_IN_STORE } : { section };
}
