# Contributing to armstat-mcp

Thanks for your interest. This is a small project, so the process is light.

## How to contribute

1. Open an [issue](https://github.com/mheryerznkanyan/armstat-mcp/issues)
   describing the change or bug.
2. [Fork](https://github.com/mheryerznkanyan/armstat-mcp/fork) the repository.
3. Make your change on a branch in your fork.
4. Run `npm test` — it must pass.
5. Open a pull request and tag [@mheryerznkanyan](https://github.com/mheryerznkanyan).

New to pull requests? See
[How to Contribute to an Open Source Project on GitHub](https://kcd.im/pull-request).

## Ground rules for this codebase

**Never let an upstream failure look like an empty result.** ArmStatBank answers
an over-rate-limit call by dropping the connection, with no status code. Code
that treats that as "no data" will silently ship a truncated catalog — this has
already happened twice here, once losing 176 tables including all current GDP
data. Any code path that fetches from ArmStatBank must retry, and must
distinguish "failed" from "empty".

**Respect the rate limit: 10 calls per 10 seconds.** `refresh.mjs` runs at
roughly one call per second. Do not speed it up.

**Keep the catalog check honest.** `test.mjs` asserts a minimum table count and
the presence of two folders that a throttled crawl tends to lose. If you change
the crawler, keep those assertions meaningful rather than relaxing them.

## Testing

```bash
npm test        # catalog integrity and search ranking
npm run dev     # local server at http://localhost:8787
```

There is deliberately no test framework. `test.mjs` is plain
`node:assert` and runs in well under a second. Please keep it that way.

## Refreshing the catalog

```bash
node refresh.mjs   # ~15 minutes, throttled; refuses to write a short catalog
```

A GitHub Action does this weekly, so you rarely need to run it by hand.
