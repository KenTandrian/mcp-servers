import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { textResult, withErrorHandling } from '@mcp-servers/core';
import { z } from 'zod';
import { gqlRequest, tokopediaCache } from '../gql.js';

const SHOP_INFO_QUERY = `query ShopInfoCore($id: Int!, $domain: String) {
  shopInfoByID(input: {shopIDs: [$id], fields: ["active_product", "allow_manage_all", "assets", "core", "closed_info", "create_info", "favorite", "location", "status", "is_open", "other-goldos", "shipment", "shopstats", "shop-snippet", "other-shiploc", "shopHomeType", "goapotik", "fs_type"], domain: $domain, source: "shoppage"}) {
    result {
      shopCore {
        domain
        shopID
        name
        defaultSort
        __typename
      }
      createInfo {
        openSince
        __typename
      }
      favoriteData {
        totalFavorite
        alreadyFavorited
        __typename
      }
      activeProduct
      shopAssets {
        avatar
        cover
        __typename
      }
      location
      isAllowManage
      isOpen
      shipmentInfo {
        isAvailable
        image
        name
        product {
          isAvailable
          productName
          uiHidden
          __typename
        }
        __typename
      }
      shippingLoc {
        districtName
        cityName
        __typename
      }
      shopStats {
        productSold
        totalTxSuccess
        totalShowcase
        __typename
      }
      statusInfo {
        shopStatus
        statusMessage
        statusTitle
        tickerType
        __typename
      }
      closedInfo {
        closedNote
        until
        reason
        detail {
          status
          __typename
        }
        __typename
      }
      bbInfo {
        bbName
        bbDesc
        bbNameEN
        bbDescEN
        __typename
      }
      goldOS {
        isGold
        isGoldBadge
        isOfficial
        badge
        shopTier
        __typename
      }
      shopSnippetURL
      customSEO {
        title
        description
        bottomContent
        __typename
      }
      isQA
      isGoApotik
      partnerInfo {
        fsType
        __typename
      }
      __typename
    }
    error {
      message
      __typename
    }
    __typename
  }
}`;

const SHOP_PRODUCTS_QUERY = `query ShopProducts($sid: String!, $source: String, $page: Int, $perPage: Int, $keyword: String, $etalaseId: String, $sort: Int, $user_districtId: String, $user_cityId: String, $user_lat: String, $user_long: String, $usecase: String) {
  GetShopProduct(shopID: $sid, source: $source, filter: {page: $page, perPage: $perPage, fkeyword: $keyword, fmenu: $etalaseId, sort: $sort, user_districtId: $user_districtId, user_cityId: $user_cityId, user_lat: $user_lat, user_long: $user_long, usecase: $usecase}) {
    status
    errors
    links {
      prev
      next
      __typename
    }
    data {
      name
      product_url
      product_id
      price {
        text_idr
        __typename
      }
      primary_image {
        original
        thumbnail
        resize300
        __typename
      }
      flags {
        isSold
        isPreorder
        isWholesale
        isWishlist
        __typename
      }
      campaign {
        discounted_percentage
        original_price_fmt
        start_date
        end_date
        __typename
      }
      label {
        color_hex
        content
        __typename
      }
      label_groups {
        position
        title
        type
        url
        styles {
          key
          value
          __typename
        }
        __typename
      }
      badge {
        title
        image_url
        __typename
      }
      stats {
        reviewCount
        rating
        averageRating
        __typename
      }
      category {
        id
        __typename
      }
      __typename
    }
    __typename
  }
}`;

export interface ShopInfoResult {
  shopCore: { domain: string; shopID: string; name: string };
  createInfo: { openSince: string };
  favoriteData: { totalFavorite: number };
  activeProduct: number;
  location: string;
  isOpen: number;
  shopStats: { productSold: string; totalTxSuccess: string; totalShowcase: string };
  statusInfo: { shopStatus: number; statusMessage: string; statusTitle: string };
  closedInfo: { closedNote: string; until: string };
  goldOS: { isGold: boolean; isOfficial: boolean; badge: string; shopTier: number };
}

interface ShopInfoResponse {
  data: {
    shopInfoByID: {
      result: ShopInfoResult[];
      error?: { message: string };
    };
  };
}

export interface ShopProductItem {
  name: string;
  product_url: string;
  product_id: string;
  price: { text_idr: string };
  flags: { isSold: boolean };
  campaign: { discounted_percentage: number; original_price_fmt: string } | null;
  stats: { reviewCount: number; averageRating: number } | null;
}

interface ShopProductsResponse {
  data: {
    GetShopProduct: {
      status: string;
      errors: string[] | null;
      links: { prev: string; next: string } | null;
      data: ShopProductItem[] | null;
    };
  };
}

async function resolveShop(shopId?: number, shopDomain?: string): Promise<ShopInfoResult | null> {
  const res = await gqlRequest<ShopInfoResponse>('ShopInfoCore', SHOP_INFO_QUERY, {
    id: shopId ?? 0,
    domain: shopDomain ?? '',
  });
  const result = res.data?.shopInfoByID?.result;
  if (!result || result.length === 0) return null;
  return result[0];
}

/**
 * Format shop metadata into a readable summary.
 */
export function formatShopInfo(shop: ShopInfoResult): string {
  const { shopCore, favoriteData, shopStats, statusInfo, closedInfo, goldOS, createInfo } = shop;

  const badges: string[] = [];
  if (goldOS.isOfficial) badges.push('[Official Store]');
  else if (goldOS.isGold) badges.push('[Power Merchant]');

  const isOpen = shop.isOpen === 1 || statusInfo.shopStatus === 1;
  const openStatus = isOpen
    ? 'Open'
    : `Closed${closedInfo.until ? ` until ${closedInfo.until}` : ''}${closedInfo.closedNote ? ` — "${closedInfo.closedNote}"` : ''}`;

  return [
    `**${shopCore.name}**${badges.length ? ` ${badges.join(' ')}` : ''}`,
    `Shop ID: ${shopCore.shopID} | Domain: ${shopCore.domain}`,
    `Location: ${shop.location || 'Not listed'}`,
    `Status: ${openStatus}`,
    createInfo.openSince ? `Open since: ${createInfo.openSince}` : '',
    '',
    'Shop Stats:',
    `- Successful transactions: ${shopStats.totalTxSuccess}`,
    `- Products sold: ${shopStats.productSold}`,
    `- Active products: ${shop.activeProduct.toLocaleString('id-ID')}`,
    `- Favorites: ${favoriteData.totalFavorite.toLocaleString('id-ID')}`,
    `- Showcases: ${shopStats.totalShowcase}`,
    '',
    `URL: https://www.tokopedia.com/${shopCore.domain}`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/**
 * Format a page of shop products into readable markdown.
 */
export function formatShopProducts(
  shopName: string,
  products: ShopProductItem[],
  page: number,
  perPage: number,
  keyword?: string,
  hasNext?: boolean,
): string {
  const lines: string[] = [
    `Products from **${shopName}**${keyword ? ` matching "${keyword}"` : ''}`,
    `Page ${page}`,
    '',
  ];

  products.forEach((p, idx) => {
    const discount =
      p.campaign && p.campaign.discounted_percentage > 0
        ? ` (-${p.campaign.discounted_percentage}%)`
        : '';
    const sold = p.flags?.isSold ? ' [Sold out]' : '';
    const rating = p.stats?.averageRating ? `${p.stats.averageRating}` : 'N/A';
    const reviews = p.stats?.reviewCount ? ` (${p.stats.reviewCount} reviews)` : '';

    lines.push(`${(page - 1) * perPage + idx + 1}. **${p.name}**`);
    lines.push(`   Price: ${p.price.text_idr}${discount}${sold}`);
    lines.push(`   Rating: ${rating}${reviews} | ID: ${p.product_id}`);
    lines.push(`   URL: ${p.product_url}`);
    if (idx < products.length - 1) lines.push('');
  });

  if (hasNext) {
    lines.push('', `Use page=${page + 1} for more results.`);
  }

  return lines.join('\n');
}

export function registerShopTools(server: McpServer): void {
  server.tool(
    'get_shop_info',
    'Get detailed information about a Tokopedia shop including stats, location, open status, and Gold/Official Merchant badges. Accepts a shop domain (slug) or numeric shop ID.',
    {
      shopId: z.number().int().positive().optional().describe('Numeric shop ID'),
      shopDomain: z
        .string()
        .optional()
        .describe('Shop domain/slug from the URL, e.g. "logitech"'),
    },
    async ({ shopId, shopDomain }) =>
      withErrorHandling(async () => {
        if (!shopId && !shopDomain) {
          return textResult('Please provide either `shopId` (numeric) or `shopDomain` (slug).');
        }

        const cacheKey = tokopediaCache.key('shop_info', shopId, shopDomain);
        const text = await tokopediaCache.getOrSet(cacheKey, async () => {
          const shop = await resolveShop(shopId, shopDomain);
          if (!shop) {
            return 'Shop not found.';
          }
          return formatShopInfo(shop);
        });

        return textResult(text);
      }),
  );

  server.tool(
    'get_shop_products',
    "Browse a shop's product listings on Tokopedia. Accepts a shop domain (slug) or numeric shop ID. Returns product names, prices, ratings, and URLs.",
    {
      shopDomain: z
        .string()
        .optional()
        .describe('Shop domain/slug from the URL, e.g. "logitech"'),
      shopId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Numeric shop ID (alternative to shopDomain)'),
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(80)
        .default(20)
        .describe('Results per page, max 80 (default: 20)'),
      keyword: z.string().optional().describe('Search within the shop by product name'),
      sort: z
        .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
        .optional()
        .describe('Sort: 1=default, 2=newest, 3=best selling, 4=price low->high, 5=price high->low'),
    },
    async ({ shopDomain, shopId, page, perPage, keyword, sort }) =>
      withErrorHandling(async () => {
        if (!shopId && !shopDomain) {
          return textResult('Please provide either `shopDomain` or `shopId`.');
        }

        const currentPage = page ?? 1;
        const itemsPerPage = perPage ?? 20;
        const cacheKey = tokopediaCache.key(
          'shop_products',
          shopId,
          shopDomain,
          currentPage,
          itemsPerPage,
          keyword,
          sort,
        );

        const text = await tokopediaCache.getOrSet(cacheKey, async () => {
          let sid = shopId ? String(shopId) : '';
          let shopName = shopDomain ?? `Shop ${sid}`;
          if (!sid) {
            const shop = await resolveShop(undefined, shopDomain);
            if (!shop) {
              return `Shop "${shopDomain}" not found.`;
            }
            sid = shop.shopCore.shopID;
            shopName = shop.shopCore.name;
          }

          const res = await gqlRequest<ShopProductsResponse>('ShopProducts', SHOP_PRODUCTS_QUERY, {
            sid,
            source: 'shop',
            page: currentPage,
            perPage: itemsPerPage,
            keyword: keyword ?? '',
            etalaseId: 'etalase',
            sort: sort ?? 1,
            user_districtId: '',
            user_cityId: '',
            user_lat: '',
            user_long: '',
            usecase: 'ace_get_shop_product_v2',
          });

          const result = res.data?.GetShopProduct;
          const products = result?.data ?? [];

          if (products.length === 0) {
            return keyword
              ? `No products matching "${keyword}" in shop "${shopName}".`
              : `No products found in shop "${shopName}".`;
          }

          return formatShopProducts(
            shopName,
            products,
            currentPage,
            itemsPerPage,
            keyword,
            Boolean(result?.links?.next),
          );
        });

        return textResult(text);
      }),
  );
}
