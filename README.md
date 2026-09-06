# armstat-mcp

Remote MCP server over [ArmStatBank](https://statbank.armstat.am), the Armenian
statistical databank — 814 tables that are near-impossible to find by hand.

## Tools

| Tool | Does |
|---|---|
| `find_indicator` | keyword search over the bundled catalog of 814 tables |
| `describe_table` | dimensions and value codes for one table |
| `get_data` | fetch a slice as JSON-stat 2.0 |

## Deploy

```sh
npm install
npm test
npx wrangler deploy
```

Then add `https://<worker>.workers.dev/mcp` as a custom connector in Claude.
No auth — the upstream API needs none, so neither does this.

## What the upstream API does to you

Discovered the hard way; all of it is handled in `src/search.mjs`.

- **10 calls / 10 seconds.** Over the limit the server *drops the connection* —
  no `429`, no status. A naive client reads that as "empty folder" and silently
  under-reports. `refresh.mjs` runs at ~1 call/sec for this reason.
- **The dataset's own `updated` field lies.** One CPI table reports `2013-04-05`
  in the payload while the catalog tree says `2026-07-08`. Trust the catalog.
- **69 of 814 tables have not updated since 2024**; the oldest is 2017.
  `find_indicator` returns `updated` so staleness is visible before you cite it.
- **Foreign trade is nearly absent** — 3 tables (domestic `33 Trade` has 7 more).
  Detailed trade data lives in separate systems on armstat.am (`?nid=148`,
  `?nid=159`, `?nid=160`), not in the API.
- **GDP exists under two standards.** SNA 1993 tables froze in 2022; the live
  series is SNA 2008 (`15 National Accounts/151 SNA 2008`, 50 tables, current to
  2026). Search hits both — check the title before quoting a number.
- Also missing from the API: publications/PDFs, microdata, methodology notes.
- `armdevinfo.am` is dead — don't wire it up.

## Refreshing

`node refresh.mjs` re-crawls into `src/catalog.tsv` (~15 min) and refuses to
overwrite with a truncated result. A GitHub Action does this weekly.

## Licence

Data belongs to the Statistical Committee of the Republic of Armenia.
No licence or terms-of-use page found on their site — check before republishing.
