# @kentandrian/bmkg-mcp

BMKG MCP server for Indonesian weather forecasts, earthquake alerts, and administrative region code lookup (`wilayah.id`).

## Tools

| Tool | Description |
| --- | --- |
| `get_latest_earthquake` | Latest significant earthquake from BMKG TEWS (`autogempa`) |
| `get_recent_earthquakes` | 15 most recent `felt` (`gempadirasakan`) or `m5_plus` (`gempaterkini`) earthquakes |
| `get_weather_forecast` | 3-day, 3-hourly BMKG weather forecast by Indonesian `adm4` village code |
| `list_regions` | Browse/filter Indonesian provinces, regencies, districts, and villages (`wilayah.id`) |

## Usage

Requires Node.js 22 or later. No API key needed.

Add to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`, Cursor `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "bmkg": {
      "command": "npx",
      "args": ["-y", "@kentandrian/bmkg-mcp"]
    }
  }
}
```

Or run it directly over stdio:

```bash
npx -y @kentandrian/bmkg-mcp
```

## Development

```bash
pnpm --filter @kentandrian/bmkg-mcp start
```
