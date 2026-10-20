import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIo } from '../../scripts/lib/io.js';

function scripted(answers) {
  const output = [];
  const io = createIo({
    readLine: async (prompt) => {
      output.push(prompt);
      return answers.shift();
    },
    write: (text) => output.push(text),
  });
  return { io, output };
}

test('ask trims the answer', async () => {
  const { io } = scripted(['  hello  ']);
  assert.equal(await io.ask('?'), 'hello');
});

test('choose lists options and returns the chosen index, re-asking on invalid input', async () => {
  const { io, output } = scripted(['7', 'abc', '2']);
  assert.equal(await io.choose('Pick:', ['a', 'b', 'c']), 1);
  assert.ok(output.includes('  2) b'));
  assert.equal(output.filter((line) => line === 'Invalid choice.').length, 2);
});

test('choose returns null on q', async () => {
  const { io } = scripted(['Q']);
  assert.equal(await io.choose('Pick:', ['a']), null);
});

test('confirm accepts y/yes/n/no and re-asks otherwise', async () => {
  const { io } = scripted(['maybe', 'YES', 'n']);
  assert.equal(await io.confirm('Sure?'), true);
  assert.equal(await io.confirm('Sure?'), false);
});
