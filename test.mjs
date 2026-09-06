import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, search, encodePath } from './src/search.mjs';

const rows = parse(readFileSync('./src/catalog.tsv', 'utf8'));
assert.ok(rows.length > 600, `catalog looks truncated: ${rows.length} rows`);
assert.ok(rows.every(r => r.path && r.title && r.updated), 'every row needs path/title/updated');

// the scorer must rank the actual unemployment table first
const hits = search(rows, 'unemployment rate');
assert.match(hits[0].title, /unemployment/i, `got: ${hits[0]?.title}`);

// stopword-only and empty queries must not return the whole catalog
assert.equal(search(rows, 'of the').length, 0);
assert.equal(search(rows, '').length, 0);

// paths carry spaces and commas; each segment must be encoded, separators kept
assert.equal(encodePath('/3 Industry, Construction/x.px'), '/3%20Industry%2C%20Construction/x.px');

console.log(`ok — ${rows.length} tables, top hit "${hits[0].title}"`);
