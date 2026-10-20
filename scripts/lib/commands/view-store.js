import { pickStore } from '../input.js';
import { buildStoreView } from '../store-view.js';

// E7: show the store map and its products in the browser.
export async function viewStore(ctx) {
  const storeName = await pickStore(ctx);
  if (storeName === null) {
    return;
  }
  await ctx.browser.showStore(buildStoreView(ctx.data, storeName));
}
