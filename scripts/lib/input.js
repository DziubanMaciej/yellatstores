// Small helpers for reading names from the user.

import { compareNames, normalize } from '../../site/lib/normalize.js';

// Trims and collapses whitespace, the form names are stored in.
export function cleanName(text) {
  return text.trim().replace(/\s+/g, ' ');
}

// "a, b ,, c" → ["a", "b", "c"]
export function splitNames(text) {
  return text.split(',').map(cleanName).filter((name) => name !== '');
}

// Finds a product or recipe by its name or any alias, ignoring case and diacritics.
// Returns { kind: 'product' | 'recipe', name } or null.
export function findByName(data, text) {
  const wanted = normalize(text);
  for (const [kind, entries] of [
    ['product', data.products],
    ['recipe', data.recipes],
  ]) {
    for (const [name, entry] of Object.entries(entries)) {
      if (normalize(name) === wanted || entry.aliases.some((alias) => normalize(alias) === wanted)) {
        return { kind, name };
      }
    }
  }
  return null;
}

// Lets the user pick a store. Returns its name, or null if there are none or the user backs out.
export async function pickStore(ctx) {
  const names = Object.keys(ctx.data.stores).sort(compareNames);
  if (names.length === 0) {
    ctx.io.print('There are no stores yet.');
    return null;
  }
  const index = await ctx.io.choose('Store:', names);
  return index === null ? null : names[index];
}
