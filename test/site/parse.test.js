import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry, splitEntries } from '../../site/lib/parse.js';

test('the list is split on newlines only; entries are trimmed and empty ones dropped', () => {
  assert.deepEqual(splitEntries('  mleko \r\n\n chleb, masło;ser \n   \n'), ['mleko', 'chleb, masło;ser']);
  assert.deepEqual(splitEntries(''), []);
});

const parsed = (entry) => {
  const { name, notes } = parseEntry(entry);
  return [name, ...notes];
};

test('every quantity form from the spec becomes the first note', () => {
  for (const entry of ['2 mleko', '2x mleko', '2X mleko', 'x2 mleko', '2 x mleko', 'mleko 2x', 'mleko x2']) {
    assert.deepEqual(parsed(entry), ['mleko', '2x'], entry);
  }
  assert.deepEqual(parsed('12 jajek'), ['jajek', '12x']);
  assert.deepEqual(parsed('1 mleko'), ['mleko', '1x']);
  assert.deepEqual(parsed('1x mleko'), ['mleko', '1x']);
  assert.deepEqual(parsed('2 mleko kokosowe'), ['mleko kokosowe', '2x']);
});

test('Polish number words 1-10 are quantities, with or without diacritics', () => {
  const words = [
    ['jeden', 1], ['jedna', 1], ['jedno', 1], ['dwa', 2], ['dwie', 2], ['trzy', 3], ['cztery', 4],
    ['pięć', 5], ['sześć', 6], ['siedem', 7], ['osiem', 8], ['dziewięć', 9], ['dziesięć', 10],
  ];
  for (const [word, n] of words) {
    assert.deepEqual(parsed(`${word} jajek`), ['jajek', `${n}x`], word);
  }
  assert.deepEqual(parsed('Piec jajek'), ['jajek', '5x']);
});

test('forms that are not quantities stay in the name', () => {
  assert.deepEqual(parsed('mleko 2'), ['mleko 2']);
  assert.deepEqual(parsed('mleko 2l'), ['mleko 2l']);
  assert.deepEqual(parsed('500g mąki'), ['500g mąki']);
  assert.deepEqual(parsed('2 xylitol'), ['xylitol', '2x']);
  assert.deepEqual(parsed('2'), ['2']);
  assert.deepEqual(parsed('dwa'), ['dwa']);
  assert.deepEqual(parsed('jedenaście jajek'), ['jedenaście jajek']);
});

test('each ( ) group is a note, after the quantity; commas inside a note stay in it', () => {
  assert.deepEqual(parsed('mleko (bez laktozy)'), ['mleko', 'bez laktozy']);
  assert.deepEqual(parsed('2 mleko (bez laktozy)'), ['mleko', '2x', 'bez laktozy']);
  assert.deepEqual(parsed('mleko (2l, bez laktozy) (Łaciate)'), ['mleko', '2l, bez laktozy', 'Łaciate']);
  assert.deepEqual(parsed('mleko (tanie) 2x'), ['mleko', '2x', 'tanie']);
  assert.deepEqual(parsed('mleko ()'), ['mleko']);
});

test('the quantity is null when none was written', () => {
  assert.equal(parseEntry('mleko (2l)').quantity, null);
  assert.equal(parseEntry('trzy mleka').quantity, '3x');
});
