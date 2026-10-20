// Store map as an SVG string. Shared by the site and the editor's browser pages.
// Styling is left to CSS via the classes below:
//   .store-map, .section, .decoration, .invisible (decoration with visible: false), .ghost

import { boundsOf, expandRect } from './geometry.js';

// Visible area used when a store has nothing drawn yet.
export const EMPTY_VIEW_BOX = { x: 0, y: 0, w: 100, h: 60 };

export function layoutRects(layout) {
  return [...layout.sections.map((s) => s.rect), ...layout.decorations.map((d) => d.rect)];
}

// Bounding box of everything drawn, with a small margin so outlines aren't clipped.
export function fitViewBox(layout) {
  const bounds = boundsOf(layoutRects(layout));
  if (bounds === null) {
    return { ...EMPTY_VIEW_BOX };
  }
  return expandRect(bounds, Math.max(bounds.w, bounds.h) * 0.02 + 0.5);
}

// layout: { sections, decorations } as in stores.json.
// ghost: optional rect drawn dashed, e.g. the old position of a section being redrawn.
export function renderLayoutSvg(layout, { viewBox = fitViewBox(layout), ghost = null } = {}) {
  const baseFontSize = Math.max(viewBox.w, viewBox.h) / 40;
  const parts = [];
  for (const decoration of layout.decorations) {
    const classes = decoration.visible === false ? 'decoration invisible' : 'decoration';
    const label = decoration.label === undefined ? '' : renderLabel(decoration.label, decoration.rect, baseFontSize);
    parts.push(`<g class="${classes}">${renderRect(decoration.rect)}${label}</g>`);
  }
  for (const section of layout.sections) {
    parts.push(
      `<g class="section" data-section="${escapeXml(section.name)}">` +
        `${renderRect(section.rect)}${renderLabel(section.name, section.rect, baseFontSize)}</g>`,
    );
  }
  if (ghost !== null) {
    parts.push(`<g class="ghost">${renderRect(ghost)}</g>`);
  }
  const vb = [viewBox.x, viewBox.y, viewBox.w, viewBox.h].map(formatNumber).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="store-map" viewBox="${vb}">${parts.join('')}</svg>`;
}

function renderRect(rect) {
  return `<rect x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.w)}" height="${formatNumber(rect.h)}"/>`;
}

// Centred label, rotated for tall narrow rects, and shrunk so it doesn't overflow the short side.
function renderLabel(text, rect, baseFontSize) {
  const vertical = rect.h > rect.w;
  const fontSize = Math.min(baseFontSize, (vertical ? rect.w : rect.h) * 0.6);
  const cx = formatNumber(rect.x + rect.w / 2);
  const cy = formatNumber(rect.y + rect.h / 2);
  const rotate = vertical ? ` transform="rotate(-90 ${cx} ${cy})"` : '';
  return (
    `<text x="${cx}" y="${cy}" font-size="${formatNumber(fontSize)}" text-anchor="middle" ` +
    `dominant-baseline="central"${rotate}>${escapeXml(text)}</text>`
  );
}

function formatNumber(n) {
  return String(Math.round(n * 100) / 100);
}

export function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
