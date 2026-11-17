# @kentandrian/id-finance-mcp

Indonesian finance MCP server providing official Bank Indonesia IDR exchange rates and live IDR cryptocurrency prices from Indodax and Pintu.

## Tools

| Tool | Description |
| --- | --- |
| `get_idr_exchange_rate` | Official Bank Indonesia Kurs Transaksi (buy, sell, mid) for foreign currencies |
| `get_crypto_prices_idr` | Live IDR crypto prices from Indodax and/or Pintu |
| `compare_crypto_idr` | Side-by-side IDR price & spread comparison between Indodax and Pintu |

## Usage

Requires Node.js 22 or later. No API key needed.

Add to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`, Cursor `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "id-finance": {
      "command": "npx",
      "args": ["-y", "@kentandrian/id-finance-mcp"]
    }
  }
}
```

Or run it directly over stdio:

```bash
npx -y @kentandrian/id-finance-mcp
```

## Development

```bash
pnpm --filter @kentandrian/id-finance-mcp start
```
