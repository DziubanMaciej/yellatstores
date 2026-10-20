// Rect helpers shared by the site, the editor and the validator.
// A rect is { x, y, w, h } in abstract units, top-left origin, y growing downwards.

// Minimum distance between any two rects of a store.
export const MIN_GAP = 1;

// Distance between two rects along the axis where they are furthest apart.
// Negative or zero means they overlap or touch.
export function rectGap(a, b) {
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(gapX, gapY);
}

export function tooClose(a, b) {
  return rectGap(a, b) < MIN_GAP;
}

// Rect spanned by two drag points, with coordinates rounded to whole units.
export function rectFromPoints(p1, p2) {
  const x1 = Math.round(Math.min(p1.x, p2.x));
  const y1 = Math.round(Math.min(p1.y, p2.y));
  const x2 = Math.round(Math.max(p1.x, p2.x));
  const y2 = Math.round(Math.max(p1.y, p2.y));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// Smallest rect containing all given rects, or null for an empty list.
export function boundsOf(rects) {
  if (rects.length === 0) {
    return null;
  }
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function expandRect(rect, margin) {
  return { x: rect.x - margin, y: rect.y - margin, w: rect.w + 2 * margin, h: rect.h + 2 * margin };
}
