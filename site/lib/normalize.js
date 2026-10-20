// Name comparison rules shared by the site and the editor. See docs/data_layout.md.

// Lowercase, collapse whitespace and strip diacritics, so that "Pomidóry " matches "pomidory".
// "ł" has no Unicode decomposition, so it needs an explicit mapping.
export function normalize(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');
}

const collator = new Intl.Collator('pl');

// Alphabetical order for display and for canonical key order in data files.
export function compareNames(a, b) {
  return collator.compare(a, b);
}
