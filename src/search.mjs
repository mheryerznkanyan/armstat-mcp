export const API = 'https://statbank.armstat.am/api/v1';

export const parse = tsv => tsv.trim().split('\n').map(l => {
  const [path, updated, title] = l.split('\t');
  return { path, updated, title };
});

// ponytail: token-overlap scoring over 638 rows. Swap for embeddings only if
// this measurably misses — at n=638 an in-memory scan costs microseconds.
// Words too common in table titles to narrow anything down.
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'than', 'that',
  'this', 'which', 'their', 'these', 'per', 'all', 'are', 'was', 'has', 'been', 'years']);

export function search(rows, query, limit = 15) {
  const terms = query.toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter(t => t.length > 2 && !STOP.has(t));
  if (!terms.length) return [];
  return rows
    .map(r => {
      const title = r.title.toLowerCase(), path = r.path.toLowerCase();
      // title hits outweigh path hits, else every table in a folder ties on the
      // folder name ("Employment and unemployment" matched all 30 of them).
      const score = terms.filter(t => title.includes(t)).length * 2
                  + terms.filter(t => path.includes(t)).length;
      return { ...r, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || b.updated.localeCompare(a.updated))
    .slice(0, limit);
}

// catalog.tsv stores decoded paths; the API needs each segment percent-encoded.
export const encodePath = p => p.split('/').map(encodeURIComponent).join('/');

// ArmStatBank drops the connection instead of returning 429. Never treat a
// failure as an empty result — that silently under-reports.
export async function armstat(path, { lang = 'en', body } = {}) {
  const url = `${API}/${lang}/ArmStatBank${encodePath(path)}`;
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: { accept: 'application/json', ...(body && { 'content-type': 'application/json' }) },
        ...(body && { body: JSON.stringify(body) }),
      });
      if (r.ok) return await r.json();
      last = `HTTP ${r.status}`;
      if (r.status >= 400 && r.status < 500) break; // bad path won't fix itself
    } catch (e) { last = e.message; }
    await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  throw new Error(`armstat ${path}: ${last} after 4 tries (rate limit is 10 calls / 10s)`);
}
