# @kentandrian/tokopedia-mcp

Tokopedia MCP server powered by Tokopedia's public GraphQL gateway (`gql.tokopedia.com`).

> [!WARNING]
> **Unofficial.** This package is not affiliated with or endorsed by Tokopedia. It uses an undocumented web gateway that may change or break without notice. Use responsibly and in accordance with Tokopedia's terms of service.

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
pnpm --filter @kentandrian/tokopedia-mcp start
```

Or via `npx` once published:

```bash
npx -y @kentandrian/tokopedia-mcp
```
