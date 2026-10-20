// Canonical on-disk form of the data files, so that every save produces the same bytes
// for the same data and git diffs stay small. See docs/data_layout.md, rule 8.

import { compareNames } from '../../site/lib/normalize.js';

export const FILES = ['products.json', 'recipes.json', 'stores.json'];

// Returns { 'products.json': text, ... } for already validated data.
export function formatData(data) {
  return {
    'products.json': formatJson(canonicalProducts(data.products)),
    'recipes.json': formatJson(canonicalRecipes(data.recipes)),
    'stores.json': formatJson(canonicalStores(data.stores)),
  };
}

function canonicalProducts(products) {
  return mapSorted(products, (product) => ({ aliases: product.aliases }));
}

function canonicalRecipes(recipes) {
  return mapSorted(recipes, (recipe) => ({ aliases: recipe.aliases, ingredients: recipe.ingredients }));
}

function canonicalStores(stores) {
  return mapSorted(stores, (store) => ({
    sections: store.sections.map((section) => ({ name: section.name, rect: canonicalRect(section.rect) })),
    decorations: store.decorations.map((decoration) => {
      const result = { rect: canonicalRect(decoration.rect) };
      if (decoration.label !== undefined) {
        result.label = decoration.label;
      }
      if (decoration.visible !== undefined) {
        result.visible = decoration.visible;
      }
      return result;
    }),
    products: mapSorted(store.products, (section) => section),
  }));
}

function canonicalRect(rect) {
  return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
}

// Copy of a name-keyed object with keys in alphabetical order and each value mapped.
function mapSorted(object, mapValue) {
  const result = {};
  for (const key of Object.keys(object).sort(compareNames)) {
    result[key] = mapValue(object[key]);
  }
  return result;
}

// Like JSON.stringify(value, null, 2), but short objects/arrays of plain values stay on
// one line, e.g. { "x": 0, "y": 0, "w": 10, "h": 8 } or ["pomidor", "pomidorów"].
const MAX_INLINE_LENGTH = 60;

export function formatJson(value) {
  return stringify(value, '') + '\n';
}

function stringify(value, indent) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  const isArray = Array.isArray(value);
  const [open, close] = isArray ? ['[', ']'] : ['{', '}'];
  const entries = isArray ? value.map((item) => [null, item]) : Object.entries(value);
  if (entries.length === 0) {
    return open + close;
  }
  const entryText = ([key, item], itemIndent) =>
    (key === null ? '' : JSON.stringify(key) + ': ') + stringify(item, itemIndent);

  const allPlain = entries.every(([, item]) => item === null || typeof item !== 'object');
  if (allPlain) {
    const inline = entries.map((entry) => entryText(entry, '')).join(', ');
    if (inline.length <= MAX_INLINE_LENGTH) {
      return isArray ? `[${inline}]` : `{ ${inline} }`;
    }
  }
  const inner = indent + '  ';
  const lines = entries.map((entry) => inner + entryText(entry, inner));
  return `${open}\n${lines.join(',\n')}\n${indent}${close}`;
}
