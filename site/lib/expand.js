// Step 3 of the pipeline: an entry that is exactly a recipe name or alias (no quantity, no
// notes) is replaced by the recipe's ingredients, each with the recipe's name as a note.

import { normalize } from './normalize.js';

// entries: parseEntry() results. Returns entries in the same shape.
export function expandRecipes(entries, recipes) {
  const byName = new Map();
  for (const [name, recipe] of Object.entries(recipes)) {
    for (const form of [name, ...recipe.aliases]) {
      byName.set(normalize(form), name);
    }
  }
  return entries.flatMap((entry) => {
    const recipe = entry.notes.length === 0 ? byName.get(normalize(entry.name)) : undefined;
    if (recipe === undefined) {
      return [entry];
    }
    return recipes[recipe].ingredients.map((product) => ({ name: product, quantity: null, notes: [recipe] }));
  });
}
