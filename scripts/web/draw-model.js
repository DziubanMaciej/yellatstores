// Pure rules of the drawing page, kept apart from the DOM so they can be tested in Node.
// The page works on a flat list of items:
//   { kind: 'section', name, originalName?, rect } | { kind: 'decoration', label?, visible?, rect }
// originalName is the name a section had when the page opened, to detect renames.

import { boundsOf, expandRect, rectFromPoints, tooClose } from '../../site/lib/geometry.js';
import { EMPTY_VIEW_BOX, layoutRects } from '../../site/lib/map.js';
import { normalize } from '../../site/lib/normalize.js';

// Area shown for drawing: everything already there plus room around it.
export function drawingArea(layout) {
  const bounds = boundsOf(layoutRects(layout));
  if (bounds === null) {
    return { ...EMPTY_VIEW_BOX };
  }
  return expandRect(bounds, Math.max(5, Math.max(bounds.w, bounds.h) * 0.15));
}

// Visible area scaled by factor (> 1 zooms out) around center, which stays at the same
// place on screen. Zoom is limited to a sensible range; beyond it the area doesn't change.
export function zoomedArea(area, factor, center) {
  const w = area.w * factor;
  if (w < 5 || w > 5000) {
    return area;
  }
  return {
    x: center.x - (center.x - area.x) * factor,
    y: center.y - (center.y - area.y) * factor,
    w,
    h: area.h * factor,
  };
}

export function itemsFromLayout(layout) {
  return [
    ...layout.sections.map((section) => ({
      kind: 'section',
      name: section.name,
      originalName: section.name,
      rect: section.rect,
    })),
    ...layout.decorations.map((decoration) => ({ kind: 'decoration', ...decoration })),
  ];
}

// Back to the stores.json form. Relative order within sections and decorations is kept,
// so existing items stay where they were and new ones end up last.
export function layoutFromItems(items) {
  return {
    sections: items.filter((i) => i.kind === 'section').map((i) => ({ name: i.name, rect: i.rect })),
    decorations: items.filter((i) => i.kind === 'decoration').map(toDecoration),
  };
}

// { oldName: newName } for every existing section renamed on the page.
export function sectionRenames(items) {
  const renames = {};
  for (const item of items) {
    if (item.kind === 'section' && item.originalName !== undefined && item.originalName !== item.name) {
      renames[item.originalName] = item.name;
    }
  }
  return renames;
}

function toDecoration(item) {
  const decoration = { rect: item.rect };
  if (item.label) {
    decoration.label = item.label;
  }
  if (item.visible === false) {
    decoration.visible = false;
  }
  return decoration;
}

// Returns why an item (newly drawn, or items[index] after editing) isn't acceptable, or null.
// Distance to other rects isn't checked here: collisions are allowed while editing
// (see findCollisions) and only block saving.
export function checkItem(item, items, index = -1) {
  if (item.rect.w < 1 || item.rect.h < 1) {
    return 'Too small. Drag a bigger rectangle.';
  }
  if (item.kind === 'section') {
    if (!item.name) {
      return 'Type a section name first.';
    }
    const taken = items.some(
      (other, i) => i !== index && other.kind === 'section' && normalize(other.name) === normalize(item.name),
    );
    if (taken) {
      return `There already is a section "${item.name}".`;
    }
  } else if (item.visible === false && !item.label) {
    return 'A text-only decoration needs a label.';
  }
  return null;
}

// Indexes of items closer than the minimum gap to any other item.
export function findCollisions(items) {
  const colliding = new Set();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (tooClose(items[i].rect, items[j].rect)) {
        colliding.add(i);
        colliding.add(j);
      }
    }
  }
  return colliding;
}

export function movedRect(rect, dx, dy) {
  return { ...rect, x: rect.x + Math.round(dx), y: rect.y + Math.round(dy) };
}

// Resizes by dragging one corner ('nw', 'ne', 'sw' or 'se') to point; the opposite corner stays.
// The result is at least 1×1 unit.
export function resizedRect(rect, corner, point) {
  const fixed = {
    x: corner.includes('w') ? rect.x + rect.w : rect.x,
    y: corner.includes('n') ? rect.y + rect.h : rect.y,
  };
  const result = rectFromPoints(fixed, point);
  return { ...result, w: Math.max(1, result.w), h: Math.max(1, result.h) };
}
