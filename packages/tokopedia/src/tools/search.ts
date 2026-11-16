import { textResult, withErrorHandling } from '@mcp-servers/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest, tokopediaCache } from '../gql.js';

export const SEARCH_QUERY = `
query SearchProductV5Query($params: String!) {
  searchProductV5(params: $params) {
    header {
      totalData
      responseCode
      keywordProcess
      keywordIntention
      additionalParams
    }
    data {
      totalDataText
      related {
        relatedKeyword
        position
      }
      suggestion {
        currentKeyword
        suggestion
        query
        text
      }
      products {
        oldID: id
        id: id_str_auto_
        name
        url
        applink
        mediaURL {
          image
          image300
        }
        shop {
          oldID: id
          id: id_str_auto_
          name
          url
          city
          tier
        }
        badge {
          oldID: id
          id: id_str_auto_
          title
          url
        }
        price {
          text
          number
          range
          original
          discountPercentage
        }
        freeShipping {
          url
        }
        labelGroups {
          position
          title
          type
          url
        }
        labelGroupsVariant {
          title
          type
          typeVariant
          hexColor
        }
        category {
          oldID: id
          id: id_str_auto_
          name
          breadcrumb
        }
        rating
        wishlist
        meta {
          oldParentID: parentID
          parentID: parentID_str_auto_
          oldWarehouseID: warehouseID
          warehouseID: warehouseID_str_auto_
          isImageBlurred
          isPortrait
        }
      }
    }
  }
}
`;

export interface SearchProduct {
  id: string;
  name: string;
  url: string;
  shop: {
    id: string;
    name: string;
    city: string;
    tier: number;
  };
  price: {
    text: string;
    number: number;
    original: string;
    discountPercentage: number;
  };
  freeShipping?: { url?: string };
  rating: string;
}

export interface SearchResponse {
  data: {
    searchProductV5: {
      header: {
        totalData: number;
        responseCode: number;
        keywordProcess: string;
      };
      data: {
        products: SearchProduct[];
      };
    };
  };
}

/**
 * Build URL-encoded query parameters for `SearchProductV5Query`.
 */
export function buildSearchParams(input: {
  query: string;
  page: number;
  rows: number;
  orderBy?: number;
  priceMin?: number;
  priceMax?: number;
  categoryId?: string;
  source?: string;
  filters?: Record<string, string>;
}): string {
  const start = (input.page - 1) * input.rows;
  const params = new URLSearchParams({
    device: 'desktop',
    enter_method: 'normal_search',
    l_name: 'sre',
    navsource: '',
    ob: String(input.orderBy ?? 23),
    page: String(input.page),
    q: input.query,
    pmin: String(input.priceMin ?? ''),
    pmax: String(input.priceMax ?? ''),
    related: 'true',
    rows: String(input.rows),
    safe_search: 'false',
    scheme: 'https',
    show_adult: 'false',
    source: input.source ?? 'search',
    srp_component_id: '02.01.00.00',
    st: 'product',
    start: String(start),
    topads_bucket: 'true',
    unique_id: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    variants: '',
  });

  if (input.categoryId) {
    params.set('sc', input.categoryId);
  }

  if (input.filters) {
    for (const [k, v] of Object.entries(input.filters)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    }
  }

  return params.toString();
}

/**
 * Format `SearchProductV5Query` results into readable markdown.
 */
export function formatSearchResults(
  title: string,
  totalData: number,
  products: SearchProduct[],
  page: number,
  rows: number,
): string {
  const totalPages = Math.ceil(totalData / rows);
  const lines: string[] = [
    title,
    `${totalData.toLocaleString('id-ID')} total products | Page ${page}/${totalPages}`,
    '',
  ];

  products.forEach((p, idx) => {
    const discount = p.price.discountPercentage > 0 ? ` (-${p.price.discountPercentage}%)` : '';
    const badge =
      p.shop.tier === 3 ? ' [Power Store]' : p.shop.tier === 2 ? ' [Official Store]' : '';
    const freeShip = p.freeShipping?.url ? ' | Free shipping' : '';

    lines.push(`${(page - 1) * rows + idx + 1}. **${p.name}**`);
    lines.push(`   Price: ${p.price.text}${discount}${freeShip}`);
    lines.push(
      `   Rating: ${p.rating || 'N/A'} | Shop: ${p.shop.name}${badge} (${p.shop.city}) | ID: ${p.id}`,
    );
    lines.push(`   URL: ${p.url}`);
    if (idx < products.length - 1) lines.push('');
  });

  return lines.join('\n');
}

export function registerSearchTools(server: McpServer): void {
  server.tool(
    'search_products',
    'Search for products on Tokopedia with sorting, price range, pagination, and filters.',
    {
      query: z.string().min(1).describe('Search query, e.g. "mechanical keyboard"'),
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      rows: z.number().int().min(1).max(60).default(20).describe('Results per page, 1-60'),
      orderBy: z
        .union([z.literal(23), z.literal(3), z.literal(4), z.literal(5), z.literal(8)])
        .optional()
        .describe(
          'Sort: 23=relevance, 3=price low->high, 4=price high->low, 5=newest, 8=most sold',
        ),
      priceMin: z.number().optional().describe('Minimum price in IDR'),
      priceMax: z.number().optional().describe('Maximum price in IDR'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Optional filter key=value pairs (e.g. {"shop_tier":"2","rt":"4,5"})'),
    },
    async (params) =>
      withErrorHandling(async () => {
        const cacheKey = tokopediaCache.key(
          'search',
          params.query,
          params.page,
          params.rows,
          params.orderBy,
          params.priceMin,
          params.priceMax,
          params.filters ? JSON.stringify(params.filters) : '',
        );

        const text = await tokopediaCache.getOrSet(cacheKey, async () => {
          const searchParams = buildSearchParams(params);
          const res = await gqlRequest<SearchResponse>('SearchProductV5Query', SEARCH_QUERY, {
            params: searchParams,
          });

          const header = res.data.searchProductV5.header;
          const products = res.data.searchProductV5.data.products ?? [];

          if (products.length === 0) {
            return `No products found for "${params.query}".`;
          }

          const totalData = header.totalData;
          const kw =
            header.keywordProcess && header.keywordProcess !== '0'
              ? header.keywordProcess
              : params.query;

          return formatSearchResults(
            `Search Results for "${kw}"`,
            totalData,
            products,
            params.page,
            params.rows,
          );
        });

        return textResult(text);
      }),
  );
}
