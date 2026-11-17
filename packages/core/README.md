# @kentandrian/mcp-core

Shared HTTP retry, TTL caching, and MCP tool response helpers for the `mcp-servers` monorepo.

## Exports

- `fetchWithRetry(url, init, options?)` — `fetch()` wrapper with timeout, exponential backoff, and `Retry-After` handling on network errors, `429`, and `5xx`.
- `HttpError` — structured error carrying `statusCode` and `endpoint`.
- `TtlCache` — in-memory TTL cache with max-entry eviction and `getOrSet()`.
- `textResult(text)` / `withErrorHandling(fn)` — MCP tool result helpers.
