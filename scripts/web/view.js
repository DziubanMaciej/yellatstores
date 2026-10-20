// "View store" page. Everything shown is computed by the editor (scripts/lib/store-view.js).
// A section on the map and its group in the list are linked: hovering either one highlights
// both slightly; clicking either one toggles a strong highlight (one at a time, as on the site).

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
  const box = document.createElement('div');
  box.className = 'group';
  if (group.section !== undefined) {
    box.dataset.section = group.section;
  }
  box.append(heading, list);
  groups.append(box);
}

let selected = null; // id of the strongly highlighted section

// Gives the section with this id, on the map and in the list, the class; null clears it.
function mark(className, id) {
  for (const element of document.querySelectorAll('[data-section]')) {
    element.classList.toggle(className, element.dataset.section === id);
  }
}

const sectionOf = (event) => event.target.closest('[data-section]')?.dataset.section ?? null;

for (const container of [document.getElementById('map'), groups]) {
  container.addEventListener('mouseover', (event) => mark('hovered', sectionOf(event)));
  container.addEventListener('mouseleave', () => mark('hovered', null));
  container.addEventListener('click', (event) => {
    const id = sectionOf(event);
    if (id !== null) {
      selected = id === selected ? null : id;
      mark('selected', selected);
    }
  });
}

document.getElementById('close').addEventListener('click', () => finish({}));
