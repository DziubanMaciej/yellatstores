import { addAliases } from './commands/add-aliases.js';
import { addProducts } from './commands/add-products.js';
import { addRecipes } from './commands/add-recipes.js';
import { assignProducts } from './commands/assign-products.js';
import { createStore } from './commands/create-store.js';
import { editLayout } from './commands/edit-layout.js';
import { validateDataCommand } from './commands/validate-data.js';
import { viewStore } from './commands/view-store.js';

const COMMANDS = [
  ['Create store', createStore],
  ['Edit store layout', editLayout],
  ['Add products', addProducts],
  ['Add aliases', addAliases],
  ['Add recipes', addRecipes],
  ['Assign products to store', assignProducts],
  ['View store', viewStore],
  ['Validate data', validateDataCommand],
];

export async function runMenu(ctx) {
  for (;;) {
    const index = await ctx.io.choose(
      '\nMain menu:',
      COMMANDS.map(([title]) => title),
      { quitWord: 'quit' },
    );
    if (index === null) {
      return;
    }
    try {
      await COMMANDS[index][1](ctx);
    } catch (e) {
      // A command bug must not leave half-applied changes in memory.
      ctx.io.print(`Error: ${e.message}`);
      ctx.reload();
    }
  }
}
