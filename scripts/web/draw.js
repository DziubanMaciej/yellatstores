// Drawing page for sections and decorations. Two modes, chosen by the editor:
// - add (params.target === null): draw any number of new sections/decorations;
//   finishes with { sections, decorations } of the new ones.
// - redraw (params.target set): draw one new rect for an existing item; finishes with { rect }.
// Cancel finishes with null.

import { rectFromPoints } from '../../site/lib/geometry.js';
import { renderLayoutSvg } from '../../site/lib/map.js';
import { finish, loadParams } from './api.js';
import { checkNewItem, drawingArea, toDecoration, toSection } from './draw-model.js';

const params = await loadParams();
const redraw = params.target !== null;
let area = drawingArea(params.layout, params.ghost);
const added = [];

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const nameInput = $('name');
const visibleInput = $('visible');

document.title = params.title;
$('title').textContent = params.title;
$('item-controls').hidden = redraw;
setStatus(redraw ? 'Drag on the map to draw the new rectangle.' : 'Pick a kind, type a name, then drag on the map.');

for (const radio of document.querySelectorAll('input[name="kind"]')) {
  radio.addEventListener('change', () => {
    const decoration = selectedKind() === 'decoration';
    $('name-label').textContent = decoration ? 'Label (optional)' : 'Name';
    $('visible-control').hidden = !decoration;
  });
}

function selectedKind() {
  return document.querySelector('input[name="kind"]:checked').value;
}

function setStatus(text, isError = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', isError);
}

function currentLayout() {
  return {
    sections: [...params.layout.sections, ...added.filter((i) => i.kind === 'section').map(toSection)],
    decorations: [...params.layout.decorations, ...added.filter((i) => i.kind === 'decoration').map(toDecoration)],
  };
}

function render() {
  canvas.innerHTML = renderLayoutSvg(currentLayout(), { viewBox: area, ghost: params.ghost });
}

function newItem(rect) {
  if (redraw) {
    return { ...params.target, rect };
  }
  const text = nameInput.value.trim().replace(/\s+/g, ' ');
  if (selectedKind() === 'section') {
    return { kind: 'section', name: text, rect };
  }
  return { kind: 'decoration', label: text || undefined, visible: visibleInput.checked, rect };
}

function addRect(rect) {
  const item = newItem(rect);
  // When redrawing, a previously drawn replacement doesn't count as an obstacle.
  const error = checkNewItem(item, redraw ? params.layout : currentLayout());
  if (error !== null) {
    setStatus(error, true);
    return;
  }
  if (redraw) {
    added.length = 0;
  } else {
    nameInput.value = '';
  }
  added.push(item);
  setStatus(redraw ? 'Drawn. Press Done to save, or drag again to replace it.' : 'Added. Draw the next one, or press Done.');
  render();
}

// Converts a pointer position to map units.
function toUnits(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

let dragStart = null;
let preview = null;

canvas.addEventListener('pointerdown', (event) => {
  const svg = canvas.querySelector('svg');
  dragStart = toUnits(svg, event);
  preview = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  preview.setAttribute('class', 'preview');
  svg.append(preview);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (dragStart === null) {
    return;
  }
  const rect = rectFromPoints(dragStart, toUnits(canvas.querySelector('svg'), event));
  preview.setAttribute('x', rect.x);
  preview.setAttribute('y', rect.y);
  preview.setAttribute('width', rect.w);
  preview.setAttribute('height', rect.h);
});

canvas.addEventListener('pointerup', (event) => {
  if (dragStart === null) {
    return;
  }
  const rect = rectFromPoints(dragStart, toUnits(canvas.querySelector('svg'), event));
  dragStart = null;
  preview.remove();
  addRect(rect);
});

$('undo').addEventListener('click', () => {
  added.pop();
  setStatus('Undone.');
  render();
});

$('more-space').addEventListener('click', () => {
  area = { ...area, w: area.w * 1.25, h: area.h * 1.25 };
  render();
});

$('cancel').addEventListener('click', () => finish(null));

$('done').addEventListener('click', () => {
  if (!redraw) {
    finish({
      sections: added.filter((i) => i.kind === 'section').map(toSection),
      decorations: added.filter((i) => i.kind === 'decoration').map(toDecoration),
    });
  } else if (added.length === 1) {
    finish({ rect: added[0].rect });
  } else {
    setStatus('Draw the new rectangle first.', true);
  }
});

render();
