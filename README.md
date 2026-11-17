# mcp-servers

A pnpm + TypeScript monorepo of Model Context Protocol (MCP) servers.

## Packages

- [`packages/core`](./packages/core) — Shared HTTP retry/backoff, TTL cache, and MCP tool helpers.
- [`packages/tokopedia`](./packages/tokopedia) — Tokopedia MCP server powered by `gql.tokopedia.com` (search, filters, shop info/products, reviews, rating summary, categories).
- [`packages/bmkg`](./packages/bmkg) — BMKG MCP server for Indonesian weather forecasts, earthquake alerts, and `wilayah.id` region code lookup.
- [`packages/id-news`](./packages/id-news) — Indonesian news and tech digest MCP server (CNBC Indonesia, Antara News, Tempo).

## Development

```bash
pnpm install
pnpm lint
pnpm build
pnpm typecheck
pnpm test:unit
pnpm test:smoke
```
