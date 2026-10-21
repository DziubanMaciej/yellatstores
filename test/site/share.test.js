import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeShare, encodeShare } from '../../site/lib/share.js';

test('the share link round-trips Polish characters, newlines and & = # inside the list', () => {
  const share = { store: 'Lidl Główna', list: '2 jajka\nżółty ser (a&b=c #1)\n100% sok' };
  const hash = encodeShare(share);
  assert.match(hash, /^#sklep=[^&=#]+&lista=[^&=#]+$/);
  assert.deepEqual(decodeShare(hash), share);
});

test('the link format is #sklep=…&lista=…', () => {
  assert.equal(encodeShare({ store: 'Lidl', list: 'mleko\nchleb' }), '#sklep=Lidl&lista=mleko%0Achleb');
  assert.deepEqual(decodeShare('#lista=mleko&sklep=Lidl'), { store: 'Lidl', list: 'mleko' });
});

test('no store, or a malformed fragment, means no share link', () => {
  for (const hash of ['', '#', '#lista=mleko', '#sklep=%E0%A4%A&lista=x', '#foo']) {
    assert.equal(decodeShare(hash), null, hash);
  }
  assert.deepEqual(decodeShare('#sklep=Lidl'), { store: 'Lidl', list: '' });
  // A store missing from the data still decodes; the page then reports it.
  assert.deepEqual(decodeShare('#sklep=Nieznany&lista=mleko'), { store: 'Nieznany', list: 'mleko' });
});
