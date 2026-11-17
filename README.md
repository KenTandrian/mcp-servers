# mcp-servers

[![CI](https://github.com/KenTandrian/mcp-servers/actions/workflows/ci.yml/badge.svg)](https://github.com/KenTandrian/mcp-servers/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Zero-config [Model Context Protocol](https://modelcontextprotocol.io) servers for Indonesian everyday services — weather, earthquakes, news, exchange rates, crypto prices, and e-commerce. No API keys, no accounts: add one line to your MCP client and go.

## Servers

| Package | Version | Description | Tools |
| --- | --- | --- | --- |
| [`@kentandrian/bmkg-mcp`](./packages/bmkg) | [![npm](https://img.shields.io/npm/v/@kentandrian/bmkg-mcp)](https://www.npmjs.com/package/@kentandrian/bmkg-mcp) | BMKG weather forecasts, earthquake alerts, and Indonesian region codes | 4 |
| [`@kentandrian/id-news-mcp`](./packages/id-news) | [![npm](https://img.shields.io/npm/v/@kentandrian/id-news-mcp)](https://www.npmjs.com/package/@kentandrian/id-news-mcp) | Latest and searchable news from CNBC Indonesia, Antara, and Tempo | 3 |
| [`@kentandrian/id-finance-mcp`](./packages/id-finance) | [![npm](https://img.shields.io/npm/v/@kentandrian/id-finance-mcp)](https://www.npmjs.com/package/@kentandrian/id-finance-mcp) | Bank Indonesia IDR exchange rates and live IDR crypto prices (Indodax, Pintu) | 3 |
| [`@kentandrian/tokopedia-mcp`](./packages/tokopedia) | [![npm](https://img.shields.io/npm/v/@kentandrian/tokopedia-mcp)](https://www.npmjs.com/package/@kentandrian/tokopedia-mcp) | Tokopedia product search, shops, reviews, and categories *(unofficial)* | 8 |

Each package README lists its tools and parameters.

## Quick start

Requires **Node.js 22+**. Add the servers you want to your MCP client config — e.g. Claude Desktop (`claude_desktop_config.json`) or Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "bmkg": { "command": "npx", "args": ["-y", "@kentandrian/bmkg-mcp"] },
    "id-news": { "command": "npx", "args": ["-y", "@kentandrian/id-news-mcp"] },
    "id-finance": { "command": "npx", "args": ["-y", "@kentandrian/id-finance-mcp"] },
    "tokopedia": { "command": "npx", "args": ["-y", "@kentandrian/tokopedia-mcp"] }
  }
}
```

Then ask things like *"Any earthquakes in Indonesia today?"*, *"What's the BI USD/IDR rate?"*, or *"Find mechanical keyboards under Rp1 juta on Tokopedia."*

## Design

- **LLM-friendly output** — concise, bounded text responses with clear tool and parameter descriptions.
- **Resilient upstreams** — shared [`@kentandrian/mcp-core`](./packages/core) provides timeouts, retry with exponential backoff (honoring `Retry-After`), and TTL caching.
- **Tested against reality** — unit tests for parsers and formatters, plus live stdio smoke tests that exercise every tool against the real upstream.
- **Supply-chain hygiene** — releases are built in GitHub Actions, published via npm Trusted Publishing with provenance, and gated behind maintainer 2FA approval.

> [!WARNING]
> `tokopedia-mcp` is **unofficial** and not affiliated with Tokopedia. It uses an undocumented web gateway that may change or break without notice. Use it responsibly and in accordance with Tokopedia's terms of service.

## Development

```bash
pnpm install
pnpm lint
pnpm build
pnpm typecheck
pnpm test:unit
pnpm test:smoke   # live upstream calls
```

```
packages/
  core/         shared HTTP, cache, and MCP helpers (@kentandrian/mcp-core)
  bmkg/         weather, earthquakes, regions
  id-news/      news RSS digest
  id-finance/   exchange rates and crypto prices
  tokopedia/    e-commerce search (unofficial)
```

### Releasing

1. Bump `version` in each changed `package.json` and its `server.json` (CI fails on mismatch).
2. Commit `chore: release x.y.z`, tag `vx.y.z`, and push the tag.
3. The Release workflow stages each new version on npm; approve with `npm stage approve <id>` (2FA).
4. Update the MCP Registry listing with `mcp-publisher publish` in each server folder.

## License

[MIT](./LICENSE) © Kenrick Tandrian
