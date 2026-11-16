import { textResult, withErrorHandling } from '@mcp-servers/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest, tokopediaCache } from '../gql.js';

const FILTER_SORT_QUERY = `
query FilterSortProductQuery($params: String!) {
  filter_sort_product(params: $params) {
    data {
      filter {
        title
        template_name
        options {
          name
          key
          value
          inputType
          totalData
          isPopular
          isNew
          child {
            key
            value
            name
            inputType
            totalData
            isPopular
          }
        }
      }
      sort {
        name
        key
        value
        inputType
        applyFilter
      }
    }
  }
}
`;

export interface FilterOption {
  name: string;
  key: string;
  value: string;
  inputType: string;
  totalData: number | string;
  isPopular: boolean;
  isNew: boolean;
  child?: Array<{
    key: string;
    value: string;
    name: string;
    inputType: string;
    totalData: number | string;
    isPopular: boolean;
  }>;
}

export interface FilterGroup {
  title: string;
  template_name: string;
  options: FilterOption[];
}

export interface SortOption {
  name: string;
  key: string;
  value: string;
  inputType: string;
  applyFilter: string;
}

interface FilterSortResponse {
  data: {
    filter_sort_product: {
      data: {
        filter: FilterGroup[];
        sort: SortOption[];
      };
    };
  };
}

/**
 * Build URL-encoded query parameters for `FilterSortProductQuery`.
 */
export function buildFilterSortParams(query: string): string {
  return new URLSearchParams({
    navsource: '',
    q: query,
    source: 'search_product',
    st: 'product',
    user_addressId: '',
    user_cityId: '',
    user_districtId: '',
    user_lat: '',
    user_long: '',
    user_postCode: '',
    user_warehouseId: '',
    warehouses: '',
  }).toString();
}

/**
 * Format Tokopedia filter and sort metadata into readable markdown for the MCP client.
 */
export function formatFiltersAndSorts(
  query: string,
  filter: FilterGroup[],
  sort: SortOption[],
): string {
  const lines: string[] = [
    `Filters & sorts for "${query}"`,
    '',
    'Pass chosen filter `key=value` pairs into `search_products` via `filters`, e.g. `{"shop_tier":"2","rt":"4,5"}`. Use `orderBy` for sort.',
    '',
    '## Sort (orderBy)',
  ];

  for (const s of sort) {
    lines.push(`- ${s.name} -> \`orderBy=${s.value}\``);
  }

  lines.push('', '## Filters (add to `filters` map)');
  for (const f of filter) {
    lines.push('', `### ${f.title}`);
    const popular = f.options.filter((o) => o.isPopular);
    const rest = f.options.filter((o) => !o.isPopular).slice(0, 12);
    const shown = popular.length > 0 ? popular : rest;

    for (const o of shown) {
      const total = Number(o.totalData);
      const count =
        Number.isFinite(total) && total > 0 ? ` (${total.toLocaleString('id-ID')} products)` : '';
      const badge = o.isNew ? ' [New]' : o.isPopular ? ' [Popular]' : '';
      lines.push(`- ${o.name}${badge} -> \`"${o.key}": "${o.value}"\`${count}`);

      if (o.child && o.child.length > 0) {
        for (const c of o.child.slice(0, 5)) {
          lines.push(`  - ${c.name} -> \`"${c.key}": "${c.value}"\``);
        }
      }
    }

    if (f.options.length > shown.length) {
      lines.push(`_(+${f.options.length - shown.length} more options)_`);
    }
  }

  return lines.join('\n');
}

export function registerFilterTools(server: McpServer): void {
  server.tool(
    'get_filters_and_sorts',
    'Get available filter options and sort orders for a Tokopedia product search query. Call this to discover valid location IDs, category IDs, and other filter values before calling search_products.',
    {
      query: z.string().min(1).describe('The search query to get filters for'),
    },
    async ({ query }) =>
      withErrorHandling(async () => {
        const cacheKey = tokopediaCache.key('filters', query);
        const text = await tokopediaCache.getOrSet(cacheKey, async () => {
          const params = buildFilterSortParams(query);
          const res = await gqlRequest<FilterSortResponse>(
            'FilterSortProductQuery',
            FILTER_SORT_QUERY,
            { params },
          );
          const { filter, sort } = res.data.filter_sort_product.data;
          return formatFiltersAndSorts(query, filter ?? [], sort ?? []);
        });

        return textResult(text);
      }),
  );
}
