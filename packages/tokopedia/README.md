# @mcp-servers/tokopedia

Tokopedia MCP server powered by Tokopedia's public GraphQL gateway (`gql.tokopedia.com`).

## Tools

| Tool | Description |
| --- | --- |
| `search_products` | Search products with sorting, price range, pagination, and custom filters |
| `get_filters_and_sorts` | Discover valid filter keys/values and sort orders for a search query |
| `get_shop_info` | Fetch shop metadata, stats, location, open status, and store badges |
| `get_shop_products` | Browse or search a shop's product catalog |
| `get_product_reviews` | Fetch customer reviews with sorting, filtering, and seller replies |
| `get_product_rating_summary` | Fetch star rating breakdown and review topics for a product |
| `get_category_tree` | Retrieve Tokopedia's category hierarchy and category IDs |
| `browse_category` | Browse products within a specific category ID (`sc` filter) |

## Running

```bash
pnpm --filter @mcp-servers/tokopedia start
```

Or via `npx` once published:

```bash
npx -y @mcp-servers/tokopedia
```
