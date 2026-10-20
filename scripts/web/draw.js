// Store layout page: draw new sections/decorations, move and resize any rect.
// - Drag on empty space draws a rect, then a popup asks for its kind and name.
// - Drag a rect to move it; select it and drag a corner handle to resize it.
// - Rects closer than the minimum gap are shown red; Done refuses to save while any are red.
// Finishes with the whole layout { sections, decorations }, or null when cancelled.

import { rectFromPoints } from '../../site/lib/geometry.js';
import { escapeXml, renderLayoutSvg } from '../../site/lib/map.js';
import { finish, loadParams } from './api.js';
import {
  checkNewItem,
  drawingArea,
  findCollisions,
  itemsFromLayout,
  layoutFromItems,
  movedRect,
  resizedRect,
} from './draw-model.js';

const HELP = 'Drag on empty space to draw a rect. Drag a rect to move it, or its corner handles to resize it.';
const CORNERS = ['nw', 'ne', 'sw', 'se'];

const params = await loadParams();
let area = drawingArea(params.layout);
let items = itemsFromLayout(params.layout);
const history = []; // earlier versions of items, for Undo
let selected = null; // index of the selected item
let drag = null; // current pointer gesture
let pending = null; // drawn rect waiting for the popup

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const dialog = $('item-dialog');

document.title = params.title;
$('title').textContent = params.title;
setStatus(HELP);

function setStatus(text, isError = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', isError);
}

function render() {
  const collisions = findCollisions(items);
  const overlay = items.map((item, index) => {
    const classes = ['hit'];
    if (collisions.has(index)) {
      classes.push('colliding');
    }
    if (index === selected) {
      classes.push('selected');
    }
    return rectMarkup(item.rect, `class="${classes.join(' ')}" data-index="${index}"`);
  });
  if (selected !== null) {
    overlay.push(...handles(items[selected].rect));
  }
  const preview = drag?.mode === 'draw' ? drag.rect : pending;
  if (preview) {
    overlay.push(rectMarkup(preview, 'class="preview"'));
  }
  const svg = renderLayoutSvg(layoutFromItems(items), { viewBox: area });
  canvas.innerHTML = svg.replace('</svg>', `${overlay.join('')}</svg>`);
}

function rectMarkup(rect, attributes) {
  return `<rect ${attributes} x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}"/>`;
}

function handles(rect) {
  const size = Math.max(area.w, area.h) / 60;
  return CORNERS.map((corner) => {
    const x = corner.includes('w') ? rect.x : rect.x + rect.w;
    const y = corner.includes('n') ? rect.y : rect.y + rect.h;
    const handle = { x: x - size / 2, y: y - size / 2, w: size, h: size };
    return rectMarkup(handle, `class="handle handle-${corner}" data-corner="${escapeXml(corner)}"`);
  });
}

// Converts a pointer position to map units.
function toUnits(event) {
  const svg = canvas.querySelector('svg');
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

canvas.addEventListener('pointerdown', (event) => {
  const point = toUnits(event);
  const handle = event.target.closest('[data-corner]');
  const hit = event.target.closest('[data-index]');
  const before = structuredClone(items);
  if (handle && selected !== null) {
    drag = { mode: 'resize', corner: handle.dataset.corner, index: selected, original: items[selected].rect, before };
  } else if (hit) {
    selected = Number(hit.dataset.index);
    drag = { mode: 'move', start: point, index: selected, original: items[selected].rect, before };
  } else {
    selected = null;
    drag = { mode: 'draw', start: point, rect: null };
  }
  canvas.setPointerCapture(event.pointerId);
  render();
});

canvas.addEventListener('pointermove', (event) => {
  if (drag === null) {
    return;
  }
  const point = toUnits(event);
  if (drag.mode === 'move') {
    items[drag.index].rect = movedRect(drag.original, point.x - drag.start.x, point.y - drag.start.y);
  } else if (drag.mode === 'resize') {
    items[drag.index].rect = resizedRect(drag.original, drag.corner, point);
  } else {
    drag.rect = rectFromPoints(drag.start, point);
  }
  render();
});

canvas.addEventListener('pointerup', () => {
  if (drag === null) {
    return;
  }
  const finished = drag;
  drag = null;
  if (finished.mode === 'draw') {
    if (finished.rect !== null && finished.rect.w >= 1 && finished.rect.h >= 1) {
      pending = finished.rect;
      openDialog();
    }
  } else if (JSON.stringify(items[finished.index].rect) !== JSON.stringify(finished.original)) {
    history.push(finished.before);
  }
  render();
  reportCollisions();
});

function reportCollisions() {
  const count = findCollisions(items).size;
  if (count > 0) {
    setStatus(`${count} rects are too close to each other (red). Move them apart before saving.`, true);
  } else {
    setStatus(HELP);
  }
}

// Popup asking what the drawn rect is.
function selectedKind() {
  return document.querySelector('input[name="kind"]:checked').value;
}

function updateDialogKind() {
  const decoration = selectedKind() === 'decoration';
  $('name-label').textContent = decoration ? 'Label (optional)' : 'Name';
  $('visible-control').hidden = !decoration;
}

function openDialog() {
  $('name').value = '';
  $('dialog-error').textContent = '';
  updateDialogKind();
  dialog.showModal();
  $('name').focus();
}

function closeDialog() {
  pending = null;
  dialog.close();
  render();
}

for (const radio of document.querySelectorAll('input[name="kind"]')) {
  radio.addEventListener('change', updateDialogKind);
}

$('item-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('name').value.trim().replace(/\s+/g, ' ');
  const item =
    selectedKind() === 'section'
      ? { kind: 'section', name: text, rect: pending }
      : { kind: 'decoration', label: text || undefined, visible: $('visible').checked, rect: pending };
  const error = checkNewItem(item, items);
  if (error !== null) {
    $('dialog-error').textContent = error;
    return;
  }
  history.push(structuredClone(items));
  items.push(item);
  closeDialog();
  reportCollisions();
});

$('dialog-cancel').addEventListener('click', closeDialog);
dialog.addEventListener('cancel', (event) => {
  // Escape key: same as Cancel.
  event.preventDefault();
  closeDialog();
});

$('undo').addEventListener('click', () => {
  if (history.length === 0) {
    setStatus('Nothing to undo.');
    return;
  }
  items = history.pop();
  selected = null;
  render();
  reportCollisions();
});

$('more-space').addEventListener('click', () => {
  area = { ...area, w: area.w * 1.25, h: area.h * 1.25 };
  render();
});

$('cancel').addEventListener('click', () => finish(null));

$('done').addEventListener('click', () => {
  if (findCollisions(items).size > 0) {
    setStatus('Some rects are too close to each other (red). Move them apart first.', true);
    return;
  }
  finish(layoutFromItems(items));
});

render();
