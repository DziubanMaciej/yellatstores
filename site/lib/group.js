// Step 7 of the pipeline: group items by store section.

import { locate } from './resolve.js';

export const UNKNOWN_TITLE = 'Nieznane';

// items: resolveEntries() results. Returns groups:
//   { section: id | null, title, items: [{ name, notes }] }
// Sections come in stores.json order and only when they have items. Unknown items come last,
// in one group (section: null), with the reason as their last note; their suggestions (see
// processList), if any, are passed along.
export function groupItems(items, store) {
  const bySection = new Map(store.sections.map((section) => [section.id, []]));
  const unknown = [];
  for (const item of items) {
    const place = locate(item, store);
    if (place.unknown) {
      const shown = { name: item.name, notes: [...item.notes, place.unknown] };
      unknown.push(item.suggestions ? { ...shown, suggestions: item.suggestions } : shown);
    } else {
      bySection.get(place.section).push({ name: item.name, notes: item.notes });
    }
  }
  const groups = store.sections
    .filter((section) => bySection.get(section.id).length > 0)
    .map((section) => ({ section: section.id, title: section.name, items: bySection.get(section.id) }));
  if (unknown.length > 0) {
    groups.push({ section: null, title: UNKNOWN_TITLE, items: unknown });
  }
  return groups;
}

// "mleko (2x, bez laktozy)"
export function formatItem(item) {
  return item.notes.length === 0 ? item.name : `${item.name} (${item.notes.join(', ')})`;
}
