# mcp-servers

A pnpm + TypeScript monorepo of Model Context Protocol (MCP) servers.

## Packages

- [`packages/core`](./packages/core) — Shared HTTP retry/backoff, TTL cache, and MCP tool helpers.
- [`packages/tokopedia`](./packages/tokopedia) — Tokopedia MCP server powered by `gql.tokopedia.com`.

## Development

```bash
pnpm install
pnpm typecheck
pnpm build
```
