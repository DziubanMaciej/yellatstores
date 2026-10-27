import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatItem } from '../../site/lib/group.js';
import { processList } from '../../site/lib/list.js';
import { sampleData } from '../helpers/sample-data.js';

// Sample store sections, in order: 1 Warzywa, 2 Makarony, 3 Nabiał.
// makaron → 2, pomidory → 1, passata → not in store, mleko unassigned.

test('groups follow the store section order, keep typed order inside, and Nieznane is last', () => {
  const text = 'xyz\nmakaron\n2 pomidory (dojrzałe)\npassata\nmleko\nmakaron (pełnoziarnisty)';
  assert.deepEqual(processList(text, sampleData(), 'Lidl Główna'), [
    { section: 1, title: 'Warzywa', items: [{ name: 'pomidory', notes: ['2x', 'dojrzałe'] }] },
    { section: 2, title: 'Makarony', items: [{ name: 'makaron', notes: ['pełnoziarnisty'] }] },
    {
      section: null,
      title: 'Nieznane',
      items: [
        { name: 'xyz', notes: ['nieznany produkt'], suggestions: [] },
        { name: 'passata', notes: ['nie ma w tym sklepie'] },
        { name: 'mleko', notes: ['nieprzypisany w tym sklepie'] },
      ],
    },
  ]);
});

test('sections without items and an empty Nieznane group are left out', () => {
  const data = sampleData();
  data.stores['Lidl Główna'].products.mleko = 3;
  assert.deepEqual(
    processList('mleko\nspaghetti bolońskie', data, 'Lidl Główna').map((g) => [g.title, g.items.map(formatItem)]),
    [
      ['Warzywa', ['pomidory (spaghetti)']],
      ['Makarony', ['makaron (spaghetti)']],
      ['Nabiał', ['mleko']],
      ['Nieznane', ['passata (spaghetti, nie ma w tym sklepie)']],
    ],
  );
  assert.deepEqual(processList('mleko', data, 'Lidl Główna').map((g) => g.title), ['Nabiał']);
  assert.deepEqual(processList('', data, 'Lidl Główna'), []);
});

test('items are shown as name (note, note, …)', () => {
  assert.equal(formatItem({ name: 'mleko', notes: [] }), 'mleko');
  assert.equal(formatItem({ name: 'mleko', notes: ['2x', 'bez laktozy'] }), 'mleko (2x, bez laktozy)');
});

test('unknown products carry suggestions; recipes only for entries without quantity or notes', () => {
  const unknown = (text) => processList(text, sampleData(), 'Lidl Główna').at(-1).items;
  assert.deepEqual(unknown('pomidorki\nspagetti\n2 spagetti\npassata'), [
    { name: 'pomidorki', notes: ['nieznany produkt'], suggestions: ['pomidory'] },
    { name: 'spagetti', notes: ['nieznany produkt'], suggestions: ['spaghetti'] },
    { name: 'spagetti', notes: ['2x', 'nieznany produkt'], suggestions: [] },
    { name: 'passata', notes: ['nie ma w tym sklepie'] },
  ]);
});
