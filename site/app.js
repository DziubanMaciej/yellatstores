// DOM wiring only; all list logic is in lib/. The URL fragment is the only state:
// no fragment → input view, #sklep=…&lista=… → result view (see lib/share.js).

import { formatItem } from './lib/group.js';
import { processList } from './lib/list.js';
import { renderLayoutSvg } from './lib/map.js';
import { decodeShare, encodeShare } from './lib/share.js';
import { fixList } from './lib/suggest.js';

const $ = (id) => document.getElementById(id);
let data = null;
let shown = null; // { store, list } of the result view on screen

async function loadData() {
  const load = async (name) => {
    const response = await fetch(`data/${name}.json`, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`${name}.json: ${response.status}`);
    }
    return response.json();
  };
  const [products, recipes, stores] = await Promise.all(['products', 'recipes', 'stores'].map(load));
  return { products, recipes, stores };
}

function render() {
  const share = decodeShare(location.hash);
  if (share === null) {
    showInput({ message: '' });
  } else if (!Object.hasOwn(data.stores, share.store)) {
    showInput({ store: '', list: share.list, message: `Nie znaleziono sklepu "${share.store}"` });
  } else if (share.list.trim() === '') {
    showInput({ store: share.store, list: share.list, message: '' });
  } else {
    showResult(share);
  }
}

// Fields left undefined keep what the form already holds (e.g. after the browser's Back).
function showInput({ store, list, message }) {
  shown = null;
  if (store !== undefined) {
    $('store').value = store;
  }
  if (list !== undefined) {
    $('list').value = list;
  }
  $('message').textContent = message;
  $('message').hidden = message === '';
  $('result-view').hidden = true;
  $('input-view').hidden = false;
  updateNext();
}

function updateNext() {
  $('next').disabled = $('store').value === '' || $('list').value.trim() === '';
}

function showResult(share) {
  shown = share;
  const store = data.stores[share.store];
  const groups = processList(share.list, data, share.store);
  const counts = new Map(groups.filter((g) => g.section !== null).map((g) => [g.section, g.items.length]));

  $('store-name').textContent = share.store;
  $('copy-status').textContent = '';
  $('map').innerHTML = renderLayoutSvg(store, { counts });
  $('groups').replaceChildren(...groups.map(renderGroup));
  $('input-view').hidden = true;
  $('result-view').hidden = false;
}

function renderGroup(group) {
  const box = document.createElement('section');
  box.className = group.section === null ? 'group unknown' : 'group';
  if (group.section !== null) {
    box.dataset.section = group.section;
  }
  const heading = document.createElement('h2');
  heading.textContent = group.title;
  const list = document.createElement('ul');
  for (const item of group.items) {
    const li = document.createElement('li');
    li.textContent = formatItem(item);
    // Each suggestion links to the same list with this name replaced.
    for (const suggestion of item.suggestions ?? []) {
      const link = document.createElement('a');
      link.className = 'suggestion';
      link.href = encodeShare({ store: shown.store, list: fixList(shown.list, item.name, suggestion) });
      link.textContent = `${suggestion}?`;
      li.append(' ', link);
    }
    list.append(li);
  }
  box.append(heading, list);
  return box;
}

// Linked highlight: a section with items on the map and its group in the list. Click/tap
// toggles it; one at a time.
function toggleHighlight(event) {
  const target = event.target.closest('.has-items[data-section], .group[data-section]');
  if (target === null) {
    return;
  }
  const id = target.classList.contains('selected') ? null : target.dataset.section;
  for (const element of document.querySelectorAll('#result-view [data-section]')) {
    element.classList.toggle('selected', element.dataset.section === id);
  }
}

$('store').addEventListener('change', updateNext);
$('list').addEventListener('input', updateNext);
$('input-view').addEventListener('submit', (event) => {
  event.preventDefault();
  location.hash = encodeShare({ store: $('store').value, list: $('list').value });
});
$('edit').addEventListener('click', () => {
  const { store, list } = shown;
  history.pushState(null, '', location.pathname + location.search);
  showInput({ store, list, message: '' });
});
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $('copy-status').textContent = 'Skopiowano';
  } catch {
    $('copy-status').textContent = 'Nie udało się skopiować';
  }
});
$('map').addEventListener('click', toggleHighlight);
$('groups').addEventListener('click', toggleHighlight);
window.addEventListener('hashchange', render);

try {
  data = await loadData();
} catch (e) {
  $('loading').hidden = true;
  $('error').textContent = `Nie udało się wczytać danych (${e.message}). Odśwież stronę.`;
  $('error').hidden = false;
  throw e;
}
for (const name of Object.keys(data.stores)) {
  $('store').append(new Option(name, name));
}
$('loading').hidden = true;
render();
