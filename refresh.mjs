// Re-crawl the ArmStatBank tree into src/catalog.tsv.
// ArmStatBank allows 10 calls / 10s and answers an over-limit call by dropping
// the connection — no 429, no status. A faster crawl silently loses whole
// folders, so this stays at ~1 call/sec. Full run takes ~15 minutes.
import { writeFileSync } from 'node:fs';
import { API, encodePath } from './src/search.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const tables = [], failed = [];

async function get(path) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(`${API}/en/ArmStatBank${encodePath(path)}`, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j)) return j;
      }
    } catch {}
    await sleep(2000 * (i + 1));
  }
  failed.push(path);
  return null;
}

async function walk(path, depth) {
  if (depth > 8) return;
  const nodes = await get(path);
  await sleep(1100);
  for (const n of nodes ?? []) {
    const child = `${path}/${n.id}`;
    if (n.type === 'l') await walk(child, depth + 1);
    else tables.push({ path: child, updated: (n.updated ?? '').slice(0, 10), title: n.text.replace(/\s+/g, ' ').trim() });
  }
}

await walk('', 0);

if (failed.length) {
  console.error(`${failed.length} folders failed after 5 tries:`);
  failed.forEach(f => console.error('  ' + f));
}
// Refuse to publish a truncated catalog over a good one.
if (tables.length < 780) {
  console.error(`Only ${tables.length} tables — refusing to overwrite catalog.tsv.`);
  process.exit(1);
}
writeFileSync('src/catalog.tsv', tables.map(t => `${t.path}\t${t.updated}\t${t.title}`).join('\n') + '\n');
console.log(`wrote src/catalog.tsv — ${tables.length} tables`);
