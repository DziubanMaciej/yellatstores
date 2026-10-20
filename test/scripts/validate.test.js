import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateData, validateDir } from '../../scripts/lib/validate.js';
import { sampleData, tempDataDir } from '../helpers/sample-data.js';

// Applies a change to fresh sample data and returns the validation errors.
function errorsAfter(change) {
  const data = sampleData();
  change(data);
  return validateData(data);
}

function assertSingleError(errors, pattern) {
  assert.equal(errors.length, 1, `expected one error, got:\n${errors.join('\n')}`);
  assert.match(errors[0], pattern);
}

const lidl = (data) => data.stores['Lidl Główna'];

test('sample data is valid', () => {
  assert.deepEqual(validateData(sampleData()), []);
});

test('empty data is valid', () => {
  assert.deepEqual(validateData({ products: {}, recipes: {}, stores: {} }), []);
});

test('rule 1: root values must be objects', () => {
  const errors = errorsAfter((d) => {
    d.products = [];
  });
  assertSingleError(errors, /products\.json: must be a JSON object/);
});

test('rule 1: unknown and missing fields are reported', () => {
  assertSingleError(
    errorsAfter((d) => {
      d.products.mleko.alias = [];
    }),
    /product "mleko": unknown field "alias"/,
  );
  assertSingleError(
    errorsAfter((d) => {
      delete lidl(d).decorations;
    }),
    /missing "decorations"/,
  );
});

test('rule 1: aliases must be strings', () => {
  assertSingleError(
    errorsAfter((d) => {
      d.products.mleko.aliases = [3];
    }),
    /aliases: must contain only strings/,
  );
});

test('rule 1: names must be trimmed and must not contain parser characters', () => {
  assertSingleError(
    errorsAfter((d) => {
      d.products['ser  żółty'] = { aliases: [] };
    }),
    /has extra whitespace/,
  );
  assertSingleError(
    errorsAfter((d) => {
      d.products.mleko.aliases = ['mleko (UHT)'];
    }),
    /can't contain , ; \( or \)/,
  );
});

test('rule 2: an alias may not collide with another product after normalisation', () => {
  assertSingleError(
    errorsAfter((d) => {
      d.products.mleko.aliases = ['Pomidór'];
    }),
    /alias "pomidor" of product "pomidory" collides with alias "Pomidór" of product "mleko"/,
  );
});

test('rule 2: a recipe name may not collide with a product', () => {
  assertSingleError(
    errorsAfter((d) => {
      d.recipes.makaron = { aliases: [], ingredients: ['makaron'] };
    }),
    /recipe "makaron" collides with product "makaron"/,
  );
});

test('rule 2: an alias may not repeat its own name', () => {
  assertSingleError(
    errorsAfter((d) => {
      d.products.mleko.aliases = ['Mleko'];
    }),
    /alias "Mleko" of product "mleko" collides with product "mleko"/,
  );
});

test('rule 3: recipe ingredients must be existing products, non-empty and unique', () => {
  assertSingleError(
    errorsAfter((d) => {
      d.recipes.spaghetti.ingredients.push('bazylia');
    }),
    /ingredient "bazylia" is not a product/,
  );
  assertSingleError(
    errorsAfter((d) => {
      d.recipes.spaghetti.ingredients = [];
    }),
    /has no ingredients/,
  );
  assertSingleError(
    errorsAfter((d) => {
      d.recipes.spaghetti.ingredients.push('makaron');
    }),
    /ingredient "makaron" is listed twice/,
  );
});

test('rule 4: section names are unique within a store', () => {
  assertSingleError(
    errorsAfter((d) => {
      lidl(d).sections.push({ name: 'warzywa', rect: { x: 40, y: 0, w: 1, h: 1 } });
    }),
    /section name "warzywa" is used more than once/,
  );
});

test('rule 5: store products must exist', () => {
  assertSingleError(
    errorsAfter((d) => {
      lidl(d).products.chleb = null;
    }),
    /product "chleb" is not in products\.json/,
  );
});

test('rule 6: store products must point to an existing section', () => {
  assertSingleError(
    errorsAfter((d) => {
      lidl(d).products.mleko = 'Pieczywo';
    }),
    /product "mleko" is assigned to unknown section "Pieczywo"/,
  );
});

test('rule 7: rects need a positive size', () => {
  assertSingleError(
    errorsAfter((d) => {
      lidl(d).sections[0].rect.w = 0;
    }),
    /width and height must be positive/,
  );
});

test('rule 7: rects must be at least 1 unit apart, decorations included', () => {
  assertSingleError(
    errorsAfter((d) => {
      lidl(d).sections[1].rect.x = 10; // touches Warzywa (x 0..10)
    }),
    /section "Warzywa" and section "Makarony" are closer than 1 unit/,
  );
  assertSingleError(
    errorsAfter((d) => {
      lidl(d).decorations[0].rect.x = 16.5; // 0.5 from Makarony (x 12..16)
    }),
    /section "Makarony" and decoration "Kasy" are closer than 1 unit/,
  );
});

test('decorations: an invisible decoration needs a label', () => {
  assertSingleError(
    errorsAfter((d) => {
      delete lidl(d).decorations[1].label;
    }),
    /an invisible decoration needs a label/,
  );
});

test('validateDir accepts canonically saved data', (t) => {
  const { dir, cleanup } = tempDataDir();
  t.after(cleanup);
  assert.deepEqual(validateDir(dir), []);
});

test('rule 8: validateDir reports files that are not canonically formatted', (t) => {
  const { dir, cleanup } = tempDataDir();
  t.after(cleanup);
  writeFileSync(join(dir, 'recipes.json'), JSON.stringify(sampleData().recipes));
  assertSingleError(validateDir(dir), /recipes\.json: not in canonical format/);
});

test('validateDir reports missing files and broken JSON', (t) => {
  const { dir, cleanup } = tempDataDir();
  t.after(cleanup);
  writeFileSync(join(dir, 'stores.json'), '{ "oops": ');
  assertSingleError(validateDir(dir), /stores\.json: invalid JSON/);
});
