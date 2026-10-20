// Pure rules of the drawing page, kept apart from the DOM so they can be tested in Node.

import { boundsOf, expandRect, MIN_GAP, tooClose } from '../../site/lib/geometry.js';
import { EMPTY_VIEW_BOX, layoutRects } from '../../site/lib/map.js';
import { normalize } from '../../site/lib/normalize.js';

// Area shown for drawing: everything already there plus room around it.
export function drawingArea(layout, ghost) {
  const rects = layoutRects(layout);
  if (ghost !== null) {
    rects.push(ghost);
  }
  const bounds = boundsOf(rects);
  if (bounds === null) {
    return { ...EMPTY_VIEW_BOX };
  }
  return expandRect(bounds, Math.max(5, Math.max(bounds.w, bounds.h) * 0.15));
}

// item: { kind: 'section' | 'decoration', name?, label?, visible?, rect }
// Returns why the item can't be added to the layout, or null if it can.
export function checkNewItem(item, layout) {
  if (item.rect.w < 1 || item.rect.h < 1) {
    return 'Too small. Drag a bigger rectangle.';
  }
  if (item.kind === 'section') {
    if (!item.name) {
      return 'Type a section name first.';
    }
    if (layout.sections.some((section) => normalize(section.name) === normalize(item.name))) {
      return `There already is a section "${item.name}".`;
    }
  } else if (item.visible === false && !item.label) {
    return 'A text-only decoration needs a label.';
  }
  for (const section of layout.sections) {
    if (tooClose(item.rect, section.rect)) {
      return `Too close to section "${section.name}". Keep at least ${MIN_GAP} unit of space.`;
    }
  }
  for (const decoration of layout.decorations) {
    if (tooClose(item.rect, decoration.rect)) {
      const name = decoration.label === undefined ? 'a decoration' : `decoration "${decoration.label}"`;
      return `Too close to ${name}. Keep at least ${MIN_GAP} unit of space.`;
    }
  }
  return null;
}

// Converts a drawn item to its stores.json form.
export function toSection(item) {
  return { name: item.name, rect: item.rect };
}

export function toDecoration(item) {
  const decoration = { rect: item.rect };
  if (item.label) {
    decoration.label = item.label;
  }
  if (item.visible === false) {
    decoration.visible = false;
  }
  return decoration;
}
