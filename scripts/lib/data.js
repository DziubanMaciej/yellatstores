// Loading and saving data/*.json. Saving always validates first and writes canonical formatting.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILES, formatData } from './format.js';
import { validateData } from './validate.js';

export const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

export class ValidationError extends Error {
  constructor(errors) {
    super(`Data is invalid:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    this.errors = errors;
  }
}

// Throws with the file name if a file is missing or isn't valid JSON.
export function loadData(dir) {
  const [products, recipes, stores] = FILES.map((file) => {
    const path = join(dir, file);
    let text;
    try {
      text = readFileSync(path, 'utf8');
    } catch (e) {
      throw new Error(`${file}: cannot read (${e.code ?? e.message})`);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`${file}: invalid JSON (${e.message})`);
    }
  });
  return { products, recipes, stores };
}

export function saveData(dir, data) {
  const errors = validateData(data);
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
  for (const [file, text] of Object.entries(formatData(data))) {
    writeFileSync(join(dir, file), text);
  }
}
