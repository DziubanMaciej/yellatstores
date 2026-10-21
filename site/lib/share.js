// The share link: the URL fragment #sklep=<store>&lista=<list> is the site's only state.

// "#sklep=Lidl&lista=mleko%0Achleb"
export function encodeShare({ store, list }) {
  return `#sklep=${encodeURIComponent(store)}&lista=${encodeURIComponent(list)}`;
}

// Returns { store, list }, or null when the fragment holds no store (or is malformed).
// A missing list is an empty one.
export function decodeShare(hash) {
  const params = new Map();
  for (const part of hash.replace(/^#/, '').split('&')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    try {
      params.set(part.slice(0, eq), decodeURIComponent(part.slice(eq + 1)));
    } catch {
      return null;
    }
  }
  if (!params.has('sklep')) {
    return null;
  }
  return { store: params.get('sklep'), list: params.get('lista') ?? '' };
}
