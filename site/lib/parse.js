// Steps 1-2 of the pipeline (docs/requirements.md §2.2): split the typed list into entries and
// parse each one into a name, an optional quantity and notes.

import { normalize } from './normalize.js';

// Polish number words 1-10, normalised (no diacritics).
const NUMBER_WORDS = new Map([
  ['jeden', 1],
  ['jedna', 1],
  ['jedno', 1],
  ['dwa', 2],
  ['dwie', 2],
  ['trzy', 3],
  ['cztery', 4],
  ['piec', 5],
  ['szesc', 6],
  ['siedem', 7],
  ['osiem', 8],
  ['dziewiec', 9],
  ['dziesiec', 10],
]);

// Quantity forms, tried in order; each captures [count, name] or [name, count].
const QUANTITY_PATTERNS = [
  { regex: /^(\d+)\s*x\s+(.+)$/i, count: 1, name: 2 }, // 2x mleko, 2 x mleko
  { regex: /^x(\d+)\s+(.+)$/i, count: 1, name: 2 }, // x2 mleko
  { regex: /^(\d+)\s+(.+)$/, count: 1, name: 2 }, // 2 mleko
  { regex: /^(.+?)\s+(\d+)x$/i, count: 2, name: 1 }, // mleko 2x
  { regex: /^(.+?)\s+x(\d+)$/i, count: 2, name: 1 }, // mleko x2
];

// One entry per non-empty line.
export function splitEntries(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

// "2 mleko (bez laktozy)" → { name: 'mleko', quantity: '2x', notes: ['2x', 'bez laktozy'] }.
// The quantity, when written, is the first note. quantity is null when none was written.
export function parseEntry(entry) {
  const noteTexts = [];
  const rest = entry
    .replace(/\(([^()]*)\)/g, (_, note) => {
      if (note.trim() !== '') {
        noteTexts.push(note.trim().replace(/\s+/g, ' '));
      }
      return ' ';
    })
    .trim()
    .replace(/\s+/g, ' ');
  const { name, quantity } = parseQuantity(rest);
  return { name, quantity, notes: quantity === null ? noteTexts : [quantity, ...noteTexts] };
}

function parseQuantity(text) {
  for (const pattern of QUANTITY_PATTERNS) {
    const match = pattern.regex.exec(text);
    if (match) {
      return { name: match[pattern.name], quantity: `${Number(match[pattern.count])}x` };
    }
  }
  const [firstWord, ...others] = text.split(' ');
  if (others.length > 0 && NUMBER_WORDS.has(normalize(firstWord))) {
    return { name: others.join(' '), quantity: `${NUMBER_WORDS.get(normalize(firstWord))}x` };
  }
  return { name: text, quantity: null };
}
