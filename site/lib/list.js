// The whole pipeline (docs/requirements.md §2.2): typed list + store → grouped list.

import { expandRecipes } from './expand.js';
import { groupItems } from './group.js';
import { parseEntry, splitEntries } from './parse.js';
import { resolveEntries } from './resolve.js';

// data: { products, recipes, stores }. Returns groupItems() output.
export function processList(text, data, storeName) {
  const entries = expandRecipes(splitEntries(text).map(parseEntry), data.recipes);
  return groupItems(resolveEntries(entries, data.products), data.stores[storeName]);
}
