import { cleanName, findByName, splitNames } from '../input.js';

// E5: add recipes; ingredients are picked by typing product names or aliases.
export async function addRecipes(ctx) {
  for (;;) {
    const name = cleanName(await ctx.io.ask('New recipe name (empty = done):'));
    if (name === '') {
      return;
    }
    if (Object.hasOwn(ctx.data.recipes, name)) {
      ctx.io.print(`Recipe "${name}" already exists.`);
      continue;
    }
    const aliases = splitNames(await ctx.io.ask('Aliases, comma-separated (empty = none):'));
    const ingredients = await askIngredients(ctx);
    if (ingredients.length === 0) {
      ctx.io.print('A recipe needs at least one ingredient. Not added.');
      continue;
    }
    if (
      ctx.change((data) => {
        data.recipes[name] = { aliases, ingredients };
      })
    ) {
      ctx.io.print(`Added recipe "${name}": ${ingredients.join(', ')}.`);
    }
  }
}

async function askIngredients(ctx) {
  const ingredients = [];
  for (;;) {
    const text = await ctx.io.ask(`Ingredient ${ingredients.length + 1} (product name or alias, empty = done):`);
    if (text === '') {
      return ingredients;
    }
    const found = findByName(ctx.data, text);
    if (found === null || found.kind !== 'product') {
      ctx.io.print(`No product matches "${text}". Add it first with "Add products".`);
    } else if (ingredients.includes(found.name)) {
      ctx.io.print(`"${found.name}" is already an ingredient.`);
    } else {
      ingredients.push(found.name);
      ctx.io.print(`  + ${found.name}`);
    }
  }
}
