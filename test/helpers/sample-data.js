// A small valid data set. Each call returns a fresh copy, so tests can mutate it freely.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveData } from '../../scripts/lib/data.js';

export function sampleData() {
  return {
    products: {
      makaron: { aliases: ['makarony'] },
      mleko: { aliases: [] },
      passata: { aliases: [] },
      pomidory: { aliases: ['pomidor', 'pomidorów'] },
    },
    recipes: {
      spaghetti: { aliases: ['spaghetti bolońskie'], ingredients: ['pomidory', 'passata', 'makaron'] },
    },
    stores: {
      'Lidl Główna': {
        sections: [
          { name: 'Warzywa', rect: { x: 0, y: 0, w: 10, h: 8 } },
          { name: 'Makarony', rect: { x: 12, y: 0, w: 4, h: 8 } },
          { name: 'Nabiał', rect: { x: 0, y: 10, w: 16, h: 3 } },
        ],
        decorations: [
          { rect: { x: 20, y: 0, w: 5, h: 3 }, label: 'Kasy' },
          { rect: { x: 20, y: 10, w: 5, h: 2 }, label: 'Wejście', visible: false },
        ],
        products: { makaron: 'Makarony', passata: null, pomidory: 'Warzywa' },
      },
    },
  };
}

// Creates a temp directory with the given data saved in it. Returns the path and a cleanup function.
export function tempDataDir(data = sampleData()) {
  const dir = mkdtempSync(join(tmpdir(), 'yellatstores-'));
  saveData(dir, data);
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
