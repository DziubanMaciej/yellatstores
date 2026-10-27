// Suggestions for unknown products: names close to what was typed (typos), and the list with
// one suggestion applied, for the suggestion's link.

import { compareNames, normalize } from './normalize.js';
import { parseEntry } from './parse.js';

const MAX_SUGGESTIONS = 3;

// Edits needed to turn a into b: insert, delete or change a letter, or swap two neighbours.
export function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Up to 3 product (and, with withRecipes, recipe) names within about one edit per three
// letters of name, closest first. Each name counts with its closest form (name or alias).
export function suggest(name, data, { withRecipes }) {
  const typed = normalize(name);
  const maxDistance = Math.max(1, Math.round(typed.length / 3));
  const candidates = Object.entries(data.products);
  if (withRecipes) {
    candidates.push(...Object.entries(data.recipes));
  }
  const found = [];
  for (const [candidate, { aliases }] of candidates) {
    const distance = Math.min(...[candidate, ...aliases].map((form) => editDistance(typed, normalize(form))));
    if (distance <= maxDistance) {
      found.push({ candidate, distance });
    }
  }
  return found
    .sort((a, b) => a.distance - b.distance || compareNames(a.candidate, b.candidate))
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => s.candidate);
}

// The list with the name `typed` replaced by `replacement` on every line naming it (compared
// normalised). Quantities and notes stay; other lines are untouched.
export function fixList(text, typed, replacement) {
  return text
    .split('\n')
    .map((line) => {
      const { name } = parseEntry(line.trim());
      if (normalize(name) !== normalize(typed)) {
        return line;
      }
      const words = name.split(' ').map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const pattern = new RegExp(words.join('\\s+'), 'g');
      // The first occurrence outside ( ) notes.
      const match = [...line.matchAll(pattern)].find((m) => depthAt(line, m.index) === 0);
      return match === undefined ? line : line.slice(0, match.index) + replacement + line.slice(match.index + match[0].length);
    })
    .join('\n');
}

function depthAt(text, index) {
  let depth = 0;
  for (const char of text.slice(0, index)) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0;
  }
  return depth;
}
