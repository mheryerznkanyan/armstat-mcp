<hr>

<div align="center">

<h1 align="center">armstat-mcp</h1>

</div>

<pre align="center">Ask Claude a question about Armenia and get the real number, from the official statistical databank.</pre>

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Refresh catalog](https://github.com/mheryerznkanyan/armstat-mcp/actions/workflows/refresh.yml/badge.svg)](https://github.com/mheryerznkanyan/armstat-mcp/actions/workflows/refresh.yml)
[![SLIM](https://img.shields.io/badge/Best%20Practices%20from-SLIM-blue)](https://nasa-ammos.github.io/slim/)

[ArmStatBank](https://statbank.armstat.am) holds 814 official statistical tables
for Armenia — GDP, inflation, population, poverty, transport, environment. It is
also close to unusable: navigation is opaque `?nid=` query strings, and there is
no working search. Finding one table is a twenty-minute job.

This is a remote [MCP](https://modelcontextprotocol.io) server that closes that
gap. It ships a pre-crawled catalog of every table, so an AI assistant can find
the right one in a single call, then fetch the actual figures live. Every result
carries the date ArmStat last updated that table, so stale series are visible
rather than quietly presented as current.

Built for journalists, analysts, researchers and civic technologists working
with Armenian data.

[ArmStatBank](https://statbank.armstat.am) | [Issue Tracker](https://github.com/mheryerznkanyan/armstat-mcp/issues)

## Features

* **Keyword search over all 814 tables** — no upstream calls, so it is instant and cannot be rate-limited
* **Live data retrieval** as [JSON-stat 2.0](https://json-stat.org/), Armenian or English labels
* **Staleness always visible** — every hit reports when ArmStat last updated it
* **Stateless** — no database, no session store, runs on Cloudflare Workers' free tier
* **Self-maintaining** — a weekly GitHub Action re-crawls the catalog and refuses to publish a truncated one

## Contents

* [Quick Start](#quick-start)
* [Known Limitations](#known-limitations)
* [Changelog](#changelog)
* [FAQ](#frequently-asked-questions-faq)
* [Contributing](#contributing)
* [License](#license)
* [Support](#support)

## Quick Start

### Requirements

* [Node.js](https://nodejs.org) 20 or later
* A free [Cloudflare](https://dash.cloudflare.com/sign-up) account (deployment only)

### Setup Instructions

1. Clone and install:
   ```bash
   git clone https://github.com/mheryerznkanyan/armstat-mcp.git
   cd armstat-mcp
   npm install
   ```
2. Verify the bundled catalog:
   ```bash
   npm test
   ```
   Expected: `ok — 814 tables, top hit "Unemployment Rate by indicators and years"`

### Run Instructions

1. Start a local server:
   ```bash
   npm run dev
   ```
2. Confirm it is serving:
   ```bash
   curl http://localhost:8787/health
   ```
   Expected: `ok, 814 tables`

### Build Instructions

Deploy to Cloudflare Workers:

```bash
npx wrangler deploy
```

Then add `https://<your-worker>.workers.dev/mcp` as a custom connector in Claude.
No authentication — the upstream API requires none, so neither does this.

### Usage Examples

Ask your assistant questions in plain language:

* *"What has Armenian inflation done since 2020?"*
* *"Show me GDP per capita under SNA 2008."*
* *"Compare poverty levels across marzes."*
* *"What are air pollutant emissions per capita?"*

Behind the scenes it calls three tools:

| Tool | Purpose |
|---|---|
| `find_indicator` | Keyword search over the bundled catalog. Returns table paths and update dates. |
| `describe_table` | Dimensions and value codes for one table. Required before `get_data`. |
| `get_data` | Fetch a slice as JSON-stat 2.0. |

Direct protocol call:

```bash
curl -X POST http://localhost:8787/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"find_indicator","arguments":{"query":"consumer price index"}}}'
```

## Known Limitations

These are properties of the upstream API, discovered by testing it. All are
handled in [`src/search.mjs`](src/search.mjs), but they shape what is possible.

* **Rate limit: 10 calls per 10 seconds.** Over the limit ArmStatBank *drops the
  connection* — no `429`, no status code. A naive client reads this as "empty
  folder" and silently under-reports. This cost this project 176 tables once;
  `npm test` now fails if the catalog is short.
* **A dataset's own `updated` field is unreliable.** One CPI table reports
  `2013-04-05` inside the payload while the catalog says `2026-07-08`. Trust the
  catalog.
* **GDP exists under two standards.** SNA 1993 tables froze in 2022; the live
  series is SNA 2008 (50 tables, current to 2026). Searches hit both, and the
  numbers are not comparable. Check the title before quoting.
* **69 of 814 tables have not been updated since 2024**; the oldest is 2017.
* **Foreign trade is nearly absent** — 3 tables. Detailed trade data lives in
  separate systems on armstat.am (`?nid=148`, `?nid=159`, `?nid=160`).
* **Government Finances has 1 table.** Budget data is effectively not here.
* **Not in the API at all:** publications and PDFs, microdata, methodology notes.
* `armdevinfo.am` no longer resolves.

## Changelog

See our [releases](https://github.com/mheryerznkanyan/armstat-mcp/releases).

## Frequently Asked Questions (FAQ)

1. **Why bundle the catalog instead of searching live?**
   - ArmStatBank has no search endpoint, and its rate limit makes crawling at
     query time impossible. Bundling makes search instant and free.
2. **How current is the catalog?**
   - A GitHub Action re-crawls it weekly. Table *data* is always fetched live,
     so only the list of tables can lag — and new tables are rare.
3. **Does this need an API key?**
   - No. The upstream API is unauthenticated.
4. **Can I use the data commercially?**
   - The data belongs to the Statistical Committee of the Republic of Armenia.
     We could find no licence or terms-of-use page on their site. The Apache 2.0
     licence here covers *this software only*, not ArmStat's data. Contact
     <support@armstat.am> before redistributing.

## Contributing

Interested in contributing? Please see [CONTRIBUTING.md](CONTRIBUTING.md).

For guidance on how to interact with our community, see
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).

This licence covers the software in this repository. Statistical data retrieved
through it belongs to the Statistical Committee of the Republic of Armenia.

## Support

Key point of contact: [@mheryerznkanyan](https://github.com/mheryerznkanyan)

For bugs and feature requests, please open an
[issue](https://github.com/mheryerznkanyan/armstat-mcp/issues).
