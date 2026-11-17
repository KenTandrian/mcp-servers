# @kentandrian/id-news-mcp

Indonesian news and tech digest MCP server powered by public RSS feeds from CNBC Indonesia, Antara News, and Tempo.

## Tools

| Tool | Description |
| --- | --- |
| `list_news_sources` | List supported Indonesian news outlets and categories |
| `get_latest_news` | Fetch latest news digest by `source` (`cnbc`, `antara`, `tempo`) and/or `category` (`general`, `business`, `tech`) |
| `search_news` | Search recent headlines and summaries by keyword across selected feeds |

## Usage

Requires Node.js 22 or later. No API key needed.

Add to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`, Cursor `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "id-news": {
      "command": "npx",
      "args": ["-y", "@kentandrian/id-news-mcp"]
    }
  }
}
```

Or run it directly over stdio:

```bash
npx -y @kentandrian/id-news-mcp
```

## Development

```bash
pnpm --filter @kentandrian/id-news-mcp start
```
