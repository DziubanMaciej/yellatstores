// The only way editor commands talk to the user. The terminal version reads from stdin;
// tests build one from a list of scripted answers (see test/helpers/scripted-io.js).

import * as readline from 'node:readline/promises';

// readLine(prompt) → Promise<string>, write(text) → void
export function createIo({ readLine, write }) {
  async function ask(question) {
    return (await readLine(`${question} `)).trim();
  }

  async function confirm(question) {
    for (;;) {
      const answer = (await ask(`${question} [y/n]`)).toLowerCase();
      if (answer === 'y' || answer === 'yes') {
        return true;
      }
      if (answer === 'n' || answer === 'no') {
        return false;
      }
      write('Please answer y or n.');
    }
  }

  // Shows a numbered list and returns the chosen index, or null when the user types "q".
  async function choose(title, options, { quitWord = 'back' } = {}) {
    write(title);
    options.forEach((option, index) => write(`  ${index + 1}) ${option}`));
    for (;;) {
      const answer = await ask(`Choose 1-${options.length} (q = ${quitWord}):`);
      if (answer.toLowerCase() === 'q') {
        return null;
      }
      const number = Number(answer);
      if (Number.isInteger(number) && number >= 1 && number <= options.length) {
        return number - 1;
      }
      write('Invalid choice.');
    }
  }

  return { ask, confirm, choose, print: write };
}

export function createTerminalIo() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // Without a listener, Ctrl+C at a prompt would only pause readline instead of exiting.
  rl.on('SIGINT', () => {
    rl.close();
    process.exit(130);
  });
  // The line iterator buffers input, so piped answers aren't lost while no prompt is pending.
  const lines = rl[Symbol.asyncIterator]();
  const readLine = async (prompt) => {
    process.stdout.write(prompt);
    const { value, done } = await lines.next();
    if (done) {
      // End of input (Ctrl+D). Every change is already saved, so just leave.
      process.stdout.write('\n');
      process.exit(0);
    }
    return value;
  };
  const io = createIo({ readLine, write: (text) => console.log(text) });
  io.close = () => rl.close();
  return io;
}
