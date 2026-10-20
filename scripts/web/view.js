// "View store" page. Everything shown is computed by the editor (scripts/lib/store-view.js).

import { finish, loadParams } from './api.js';

const view = await loadParams();
document.title = `View: ${view.title}`;
document.getElementById('title').textContent = view.title;
document.getElementById('map').innerHTML = view.svg;

const groups = document.getElementById('groups');
for (const group of view.groups) {
  const heading = document.createElement('h2');
  heading.textContent = `${group.title} (${group.items.length})`;
  const list = document.createElement('ul');
  for (const item of group.items) {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  }
  if (group.items.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'no products';
    list.append(li);
  }
  groups.append(heading, list);
}

document.getElementById('close').addEventListener('click', () => finish({}));
