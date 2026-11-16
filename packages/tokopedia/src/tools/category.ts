import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { textResult, withErrorHandling } from '@mcp-servers/core';
import { z } from 'zod';
import { gqlRequest, tokopediaCache } from '../gql.js';
import {
  SEARCH_QUERY,
  type SearchResponse,
  buildSearchParams,
  formatSearchResults,
} from './search.js';

const CATEGORY_ALL_LIST_QUERY = `query categoryAllList($categoryID: Int, $type: String) {
  CategoryAllList: categoryAllList(categoryID: $categoryID, type: $type) {
    categories {
      identifier
      name
      id
      child {
        id
        template
        name
        url
        iconImageUrl
        child {
          name
          url
          id
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}`;

export interface CategoryLeaf {
  id: string;
  name: string;
  url: string;
}

export interface CategoryChild {
  id: string;
  name: string;
  url: string;
  child?: CategoryLeaf[] | null;
}

export interface CategoryRoot {
  identifier: string;
  id: string;
  name: string;
  child?: CategoryChild[] | null;
}

interface CategoryAllListResponse {
  data: {
    CategoryAllList: {
      categories: CategoryRoot[];
    } | null;
  };
}

/**
 * Format Tokopedia's category hierarchy into readable markdown.
 */
export function formatCategoryTree(
  categories: CategoryRoot[],
  maxDepth = 2,
): string {
  if (categories.length === 0) {
    return 'No categories found.';
  }

  const lines: string[] = ['Tokopedia Category Tree', ''];
  for (const root of categories) {
    lines.push(`- **${root.name}** (ID: ${root.id})`);
    if (maxDepth >= 2 && root.child && root.child.length > 0) {
      for (const sub of root.child) {
        lines.push(`  - ${sub.name} (ID: ${sub.id})`);
        if (maxDepth >= 3 && sub.child && sub.child.length > 0) {
          for (const leaf of sub.child.slice(0, 8)) {
            lines.push(`    - ${leaf.name} (ID: ${leaf.id})`);
          }
          if (sub.child.length > 8) {
            lines.push(`    - _(+${sub.child.length - 8} more)_`);
          }
        }
      }
    }
  }

  return lines.join('\n');
}

export function registerCategoryTools(server: McpServer): void {
  server.tool(
    'get_category_tree',
    'Get Tokopedia product category tree and category IDs for use with browse_category.',
    {
      categoryId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Optional parent category ID to scope the tree'),
      depth: z
        .number()
        .int()
        .min(1)
        .max(3)
        .default(2)
        .describe('Tree depth to display: 1=top-level, 2=subcategories, 3=leaf categories'),
    },
    async ({ categoryId, depth }) =>
      withErrorHandling(async () => {
        const treeDepth = depth ?? 2;
        const cacheKey = tokopediaCache.key('category_tree', categoryId ?? 'all', treeDepth);

        const text = await tokopediaCache.getOrSet(cacheKey, async () => {
          const variables: Record<string, unknown> = {};
          if (categoryId !== undefined) {
            variables.categoryID = categoryId;
          }

          const res = await gqlRequest<CategoryAllListResponse>(
            'categoryAllList',
            CATEGORY_ALL_LIST_QUERY,
            variables,
          );
          const categories = res.data?.CategoryAllList?.categories ?? [];
          return formatCategoryTree(categories, treeDepth);
        });

        return textResult(text);
      }),
  );

  server.tool(
    'browse_category',
    'Browse products in a Tokopedia category by category ID (`sc` filter), with optional keyword, sorting, and price range.',
    {
      categoryId: z.string().min(1).describe('Category ID (e.g. from get_category_tree)'),
      query: z.string().optional().describe('Optional keyword to filter within the category'),
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      rows: z.number().int().min(1).max(60).default(20).describe('Results per page, 1-60'),
      orderBy: z
        .union([z.literal(23), z.literal(3), z.literal(4), z.literal(5), z.literal(8)])
        .optional()
        .describe('Sort: 23=relevance, 3=price low->high, 4=price high->low, 5=newest, 8=most sold'),
      priceMin: z.number().optional().describe('Minimum price in IDR'),
      priceMax: z.number().optional().describe('Maximum price in IDR'),
    },
    async (params) =>
      withErrorHandling(async () => {
        const currentPage = params.page ?? 1;
        const pageRows = params.rows ?? 20;
        const cacheKey = tokopediaCache.key(
          'browse_category',
          params.categoryId,
          params.query ?? '',
          currentPage,
          pageRows,
          params.orderBy,
          params.priceMin,
          params.priceMax,
        );

        const text = await tokopediaCache.getOrSet(cacheKey, async () => {
          const searchParams = buildSearchParams({
            query: params.query ?? '',
            page: currentPage,
            rows: pageRows,
            orderBy: params.orderBy,
            priceMin: params.priceMin,
            priceMax: params.priceMax,
            categoryId: params.categoryId,
            source: 'directory',
          });

          const res = await gqlRequest<SearchResponse>('SearchProductV5Query', SEARCH_QUERY, {
            params: searchParams,
          });

          const header = res.data.searchProductV5.header;
          const products = res.data.searchProductV5.data.products ?? [];

          if (products.length === 0) {
            return `No products found in category ${params.categoryId}.`;
          }

          return formatSearchResults(
            `Category ${params.categoryId}${params.query ? ` ("${params.query}")` : ''}`,
            header.totalData,
            products,
            currentPage,
            pageRows,
          );
        });

        return textResult(text);
      }),
  );
}
