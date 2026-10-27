// The whole pipeline (docs/requirements.md §2.2): typed list + store → grouped list.

import { expandRecipes } from './expand.js';
import { groupItems } from './group.js';
import { parseEntry, splitEntries } from './parse.js';
import { resolveEntries } from './resolve.js';
import { suggest } from './suggest.js';

// data: { products, recipes, stores }. Returns groupItems() output.
// Unknown products get suggestions: close product names, plus recipe names when the entry
// has no quantity or notes (a recipe with them wouldn't expand).
export function processList(text, data, storeName) {
  const entries = expandRecipes(splitEntries(text).map(parseEntry), data.recipes);
  const items = resolveEntries(entries, data.products).map((item) =>
    item.product === null
      ? { ...item, suggestions: suggest(item.name, data, { withRecipes: item.notes.length === 0 }) }
      : item,
  );
  return groupItems(items, data.stores[storeName]);
}
