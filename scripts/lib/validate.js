// Integrity rules from docs/data_layout.md. Every function returns a list of error messages;
// an empty list means the data is valid.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalize } from '../../site/lib/normalize.js';
import { MIN_GAP, tooClose } from '../../site/lib/geometry.js';
import { FILES, formatData } from './format.js';
import { loadData } from './data.js';

// Characters the site's list parser treats as separators or notes, so names containing
// them could never be matched.
const FORBIDDEN_NAME_CHARS = /[,;()]/;

const FORMAT_ERROR = 'not in canonical format';

// True for errors that only mean "valid data, but not formatted as the editor writes it".
export function isFormatError(error) {
  return error.includes(FORMAT_ERROR);
}

// Validates a data directory: files load, data is valid, files are canonically formatted.
export function validateDir(dir) {
  let data;
  try {
    data = loadData(dir);
  } catch (e) {
    return [e.message];
  }
  const errors = validateData(data);
  if (errors.length === 0) {
    const expected = formatData(data);
    for (const file of FILES) {
      if (readFileSync(join(dir, file), 'utf8') !== expected[file]) {
        errors.push(`${file}: ${FORMAT_ERROR} (the editor's "Validate data" can reformat it)`);
      }
    }
  }
  return errors;
}

export function validateData(data) {
  const errors = [];
  const roots = [
    ['products.json', data.products],
    ['recipes.json', data.recipes],
    ['stores.json', data.stores],
  ];
  for (const [file, value] of roots) {
    if (!isPlainObject(value)) {
      errors.push(`${file}: must be a JSON object`);
    }
  }
  if (errors.length > 0) {
    return errors;
  }

  const names = new NameRegistry(errors);
  validateProducts(data.products, names, errors);
  validateRecipes(data.recipes, data.products, names, errors);
  validateStores(data.stores, data.products, errors);
  return errors;
}

// Tracks every name a list entry can match (product/recipe names and aliases),
// reporting any two that are equal after normalisation.
class NameRegistry {
  constructor(errors) {
    this.errors = errors;
    this.owners = new Map();
  }

  add(name, description) {
    const key = normalize(name);
    const owner = this.owners.get(key);
    if (owner === undefined) {
      this.owners.set(key, description);
    } else {
      this.errors.push(`${description} collides with ${owner} (both match "${key}")`);
    }
  }
}

function validateProducts(products, names, errors) {
  for (const [name, product] of Object.entries(products)) {
    const where = `products.json: product "${name}"`;
    checkSearchName(name, where, errors);
    names.add(name, `product "${name}"`);
    if (!checkFields(product, ['aliases'], [], where, errors)) {
      continue;
    }
    for (const alias of checkStringArray(product.aliases, `${where}: aliases`, errors)) {
      checkSearchName(alias, `${where}: alias "${alias}"`, errors);
      names.add(alias, `alias "${alias}" of product "${name}"`);
    }
  }
}

function validateRecipes(recipes, products, names, errors) {
  for (const [name, recipe] of Object.entries(recipes)) {
    const where = `recipes.json: recipe "${name}"`;
    checkSearchName(name, where, errors);
    names.add(name, `recipe "${name}"`);
    if (!checkFields(recipe, ['aliases', 'ingredients'], [], where, errors)) {
      continue;
    }
    for (const alias of checkStringArray(recipe.aliases, `${where}: aliases`, errors)) {
      checkSearchName(alias, `${where}: alias "${alias}"`, errors);
      names.add(alias, `alias "${alias}" of recipe "${name}"`);
    }
    const ingredients = checkStringArray(recipe.ingredients, `${where}: ingredients`, errors);
    if (Array.isArray(recipe.ingredients) && recipe.ingredients.length === 0) {
      errors.push(`${where}: has no ingredients`);
    }
    const seen = new Set();
    for (const ingredient of ingredients) {
      if (!Object.hasOwn(products, ingredient)) {
        errors.push(`${where}: ingredient "${ingredient}" is not a product`);
      }
      if (seen.has(ingredient)) {
        errors.push(`${where}: ingredient "${ingredient}" is listed twice`);
      }
      seen.add(ingredient);
    }
  }
}

function validateStores(stores, products, errors) {
  for (const [storeName, store] of Object.entries(stores)) {
    const where = `stores.json: store "${storeName}"`;
    checkLabel(storeName, where, errors);
    if (!checkFields(store, ['sections', 'decorations', 'products'], [], where, errors)) {
      continue;
    }
    const placed = []; // { rect, description } of every valid rect, for the gap check
    const sectionIds = new Set();
    const normalizedSectionNames = new Set();

    if (!Array.isArray(store.sections)) {
      errors.push(`${where}: sections must be an array`);
    } else {
      store.sections.forEach((section, index) => {
        const sectionWhere = `${where}: section #${index + 1}`;
        if (!checkFields(section, ['id', 'name', 'rect'], [], sectionWhere, errors)) {
          return;
        }
        if (!Number.isInteger(section.id) || section.id < 1) {
          errors.push(`${sectionWhere}: id must be a positive integer`);
        } else if (sectionIds.has(section.id)) {
          errors.push(`${where}: section id ${section.id} is used more than once`);
        } else {
          sectionIds.add(section.id);
        }
        if (checkLabel(section.name, sectionWhere, errors)) {
          if (normalizedSectionNames.has(normalize(section.name))) {
            errors.push(`${where}: section name "${section.name}" is used more than once`);
          }
          normalizedSectionNames.add(normalize(section.name));
        }
        if (checkRect(section.rect, `${sectionWhere}: rect`, errors)) {
          placed.push({ rect: section.rect, description: `section "${section.name}"` });
        }
      });
    }

    if (!Array.isArray(store.decorations)) {
      errors.push(`${where}: decorations must be an array`);
    } else {
      store.decorations.forEach((decoration, index) => {
        const decorationWhere = `${where}: decoration #${index + 1}`;
        if (!checkFields(decoration, ['rect'], ['label', 'visible'], decorationWhere, errors)) {
          return;
        }
        if (decoration.label !== undefined) {
          checkLabel(decoration.label, `${decorationWhere}: label`, errors);
        }
        if (decoration.visible !== undefined && typeof decoration.visible !== 'boolean') {
          errors.push(`${decorationWhere}: visible must be true or false`);
        }
        if (decoration.visible === false && decoration.label === undefined) {
          errors.push(`${decorationWhere}: an invisible decoration needs a label`);
        }
        if (checkRect(decoration.rect, `${decorationWhere}: rect`, errors)) {
          const description =
            decoration.label === undefined ? `decoration #${index + 1}` : `decoration "${decoration.label}"`;
          placed.push({ rect: decoration.rect, description });
        }
      });
    }

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        if (tooClose(placed[i].rect, placed[j].rect)) {
          errors.push(
            `${where}: ${placed[i].description} and ${placed[j].description} are closer than ${MIN_GAP} unit`,
          );
        }
      }
    }

    if (!isPlainObject(store.products)) {
      errors.push(`${where}: products must be an object`);
      continue;
    }
    for (const [productName, sectionId] of Object.entries(store.products)) {
      if (!Object.hasOwn(products, productName)) {
        errors.push(`${where}: product "${productName}" is not in products.json`);
      }
      if (sectionId !== null && !sectionIds.has(sectionId)) {
        errors.push(`${where}: product "${productName}" is assigned to unknown section id ${JSON.stringify(sectionId)}`);
      }
    }
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Checks that value is an object with all required fields and no unknown ones.
function checkFields(value, required, optional, where, errors) {
  if (!isPlainObject(value)) {
    errors.push(`${where}: must be an object`);
    return false;
  }
  let ok = true;
  for (const field of required) {
    if (!Object.hasOwn(value, field)) {
      errors.push(`${where}: missing "${field}"`);
      ok = false;
    }
  }
  for (const field of Object.keys(value)) {
    if (!required.includes(field) && !optional.includes(field)) {
      errors.push(`${where}: unknown field "${field}"`);
      ok = false;
    }
  }
  return ok;
}

// Returns the string items of an array (reporting everything else), or [] if it isn't an array.
function checkStringArray(value, where, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${where}: must be an array`);
    return [];
  }
  const strings = value.filter((item) => typeof item === 'string');
  if (strings.length !== value.length) {
    errors.push(`${where}: must contain only strings`);
  }
  return strings;
}

// Display names: non-empty, no leading/trailing or repeated whitespace.
function checkLabel(value, where, errors) {
  if (typeof value !== 'string' || value === '') {
    errors.push(`${where}: name must be a non-empty string`);
    return false;
  }
  if (value !== value.trim().replace(/\s+/g, ' ')) {
    errors.push(`${where}: "${value}" has extra whitespace`);
    return false;
  }
  return true;
}

// Names matched against the grocery list additionally can't contain parser characters.
function checkSearchName(value, where, errors) {
  if (checkLabel(value, where, errors) && FORBIDDEN_NAME_CHARS.test(value)) {
    errors.push(`${where}: names can't contain , ; ( or )`);
  }
}

function checkRect(rect, where, errors) {
  if (!checkFields(rect, ['x', 'y', 'w', 'h'], [], where, errors)) {
    return false;
  }
  if (!['x', 'y', 'w', 'h'].every((key) => Number.isFinite(rect[key]))) {
    errors.push(`${where}: x, y, w, h must be numbers`);
    return false;
  }
  if (rect.w <= 0 || rect.h <= 0) {
    errors.push(`${where}: width and height must be positive`);
    return false;
  }
  return true;
}
