// Talks to the editor's local server (scripts/lib/browser.js).

export async function loadParams() {
  const response = await fetch('/api/params');
  return response.json();
}

// Sends the result back to the terminal and replaces the page with a short note.
export async function finish(result) {
  await fetch('/api/result', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(result),
  });
  document.body.innerHTML = '<p class="done-message">Done. You can close this tab and continue in the terminal.</p>';
}
