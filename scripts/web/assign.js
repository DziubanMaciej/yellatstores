// "Assign products" page: shows one unassigned product at a time; clicking a section on the
// map (or "Not in this store") saves the answer right away through the terminal.
// Skip leaves the product unassigned. Back returns to the previous product and clears its answer.
// params: { title, svg, sections: [{ id, name }], products: [name, …] }

import { finish, loadParams, send } from './api.js';

const params = await loadParams();
const $ = (id) => document.getElementById(id);
const sectionNames = new Map(params.sections.map((section) => [section.id, section.name]));
let index = 0; // position of the current product in params.products
let busy = false; // a save is on its way

document.title = params.title;
$('title').textContent = params.title;
$('map').innerHTML = params.svg;
show('Click a section on the map.');

function show(status, isError = false) {
  const finished = index >= params.products.length;
  $('progress').textContent = finished ? '' : `${index + 1}/${params.products.length}`;
  $('product').textContent = finished ? 'All products done. Press Done.' : params.products[index];
  $('not-in-store').disabled = finished;
  $('skip').disabled = finished;
  $('back').disabled = index === 0;
  $('map').classList.toggle('finished', finished);
  $('status').textContent = status;
  $('status').classList.toggle('error', isError);
}

// section: an id, or null for "not in this store".
async function answer(section) {
  if (busy || index >= params.products.length) {
    return;
  }
  const product = params.products[index];
  busy = true;
  const reply = await send({ product, section });
  busy = false;
  if (reply.error) {
    show(reply.error, true);
    return;
  }
  index++;
  show(section === null ? `Saved: ${product} → not in this store.` : `Saved: ${product} → ${section}) ${sectionNames.get(section)}.`);
}

$('map').addEventListener('click', (event) => {
  const section = event.target.closest('[data-section]');
  if (section) {
    answer(Number(section.dataset.section));
  }
});
$('not-in-store').addEventListener('click', () => answer(null));
$('skip').addEventListener('click', () => {
  index++;
  show(`Skipped: ${params.products[index - 1]}.`);
});
$('back').addEventListener('click', async () => {
  if (busy || index === 0) {
    return;
  }
  index--;
  busy = true;
  const reply = await send({ product: params.products[index], unassign: true });
  busy = false;
  show(reply.error ?? 'Back. Choose again.', Boolean(reply.error));
});
$('done').addEventListener('click', () => finish({}));
