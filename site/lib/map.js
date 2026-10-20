// Store map as an SVG string. Shared by the site and the editor's browser pages.
// Styling is left to CSS via the classes below:
//   .store-map, .section, .decoration, .invisible (decoration with visible: false), .section-id
// Sections carry data-section="<id>".

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
// showIds: write each section's id in its top-left corner. Editor only: the site must not
// show ids, they mean nothing to a shopper.
export function renderLayoutSvg(layout, { viewBox = fitViewBox(layout), showIds = false } = {}) {
  // Label size is relative to the store, not to the visible area, so labels scale with the
  // map when zooming instead of staying the same size on screen.
  const storeSize = fitViewBox(layout);
  const baseFontSize = Math.max(storeSize.w, storeSize.h) / 40;
  const parts = [];
  for (const decoration of layout.decorations) {
    const classes = decoration.visible === false ? 'decoration invisible' : 'decoration';
    const label = decoration.label === undefined ? '' : renderLabel(decoration.label, decoration.rect, baseFontSize);
    parts.push(`<g class="${classes}">${renderRect(decoration.rect)}${label}</g>`);
  }
  for (const section of layout.sections) {
    const id = showIds ? renderId(section.id, section.rect, baseFontSize) : '';
    parts.push(
      `<g class="section" data-section="${section.id}">` +
        `${renderRect(section.rect)}${renderLabel(section.name, section.rect, baseFontSize)}${id}</g>`,
    );
  }
  const vb = [viewBox.x, viewBox.y, viewBox.w, viewBox.h].map(formatNumber).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="store-map" viewBox="${vb}">${parts.join('')}</svg>`;
}

function renderRect(rect) {
  return `<rect x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.w)}" height="${formatNumber(rect.h)}"/>`;
}

// Rough width of an average character, in font-size units.
const CHAR_WIDTH = 0.6;

// Largest font size (up to baseFontSize) at which text fits a box `along` wide and `across` high.
function fittingFontSize(text, along, across, baseFontSize) {
  const byLength = (along * 0.9) / (Math.max(text.length, 1) * CHAR_WIDTH);
  return Math.min(baseFontSize, across * 0.7, byLength);
}

// Centred label, shrunk to fit inside its rect, and rotated when that lets it be bigger
// (tall narrow sections).
function renderLabel(text, rect, baseFontSize) {
  const horizontalSize = fittingFontSize(text, rect.w, rect.h, baseFontSize);
  const verticalSize = fittingFontSize(text, rect.h, rect.w, baseFontSize);
  const vertical = verticalSize > horizontalSize;
  const fontSize = vertical ? verticalSize : horizontalSize;
  const cx = formatNumber(rect.x + rect.w / 2);
  const cy = formatNumber(rect.y + rect.h / 2);
  const rotate = vertical ? ` transform="rotate(-90 ${cx} ${cy})"` : '';
  return (
    `<text x="${cx}" y="${cy}" font-size="${formatNumber(fontSize)}" text-anchor="middle" ` +
    `dominant-baseline="central"${rotate}>${escapeXml(text)}</text>`
  );
}

// Small id number in the top-left corner, scaled down for small rects.
function renderId(id, rect, baseFontSize) {
  const fontSize = Math.min(baseFontSize * 0.8, rect.w * 0.4, rect.h * 0.4);
  const pad = fontSize * 0.3;
  return (
    `<text class="section-id" x="${formatNumber(rect.x + pad)}" y="${formatNumber(rect.y + pad)}" ` +
    `font-size="${formatNumber(fontSize)}" dominant-baseline="hanging">${id}</text>`
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
