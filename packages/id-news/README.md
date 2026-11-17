# @mcp-servers/id-news

Indonesian news and tech digest MCP server powered by public RSS feeds from CNBC Indonesia, Antara News, and Tempo.

## Tools

| Tool | Description |
| --- | --- |
| `list_news_sources` | List supported Indonesian news outlets and categories |
| `get_latest_news` | Fetch latest news digest by `source` (`cnbc`, `antara`, `tempo`) and/or `category` (`general`, `business`, `tech`) |
| `search_news` | Search recent headlines and summaries by keyword across selected feeds |

## Running

```bash
pnpm --filter @mcp-servers/id-news start
```
