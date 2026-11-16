import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { textResult, withErrorHandling } from '@mcp-servers/core';
import { z } from 'zod';
import { gqlRequest, tokopediaCache } from '../gql.js';

const REVIEW_LIST_QUERY = `query productReviewList($productID: String!, $page: Int!, $limit: Int!, $sortBy: String, $filterBy: String) {
  productrevGetProductReviewList(productID: $productID, page: $page, limit: $limit, sortBy: $sortBy, filterBy: $filterBy) {
    productID
    list {
      id: feedbackID
      variantName
      message
      productRating
      reviewCreateTime
      reviewCreateTimestamp
      isReportable
      isAnonymous
      imageAttachments {
        attachmentID
        imageThumbnailUrl
        imageUrl
        __typename
      }
      videoAttachments {
        attachmentID
        videoUrl
        __typename
      }
      reviewResponse {
        message
        createTime
        __typename
      }
      user {
        userID
        fullName
        image
        url
        __typename
      }
      likeDislike {
        totalLike
        likeStatus
        __typename
      }
      stats {
        key
        formatted
        count
        __typename
      }
      badRatingReasonFmt
      __typename
    }
    shop {
      shopID
      name
      url
      image
      __typename
    }
    hasNext
    totalReviews
    __typename
  }
}`;

export interface ReviewItem {
  id: string;
  variantName: string;
  message: string;
  productRating: number;
  reviewCreateTime: string;
  isAnonymous: boolean;
  imageAttachments: Array<{ imageUrl: string }> | null;
  reviewResponse: { message: string; createTime: string } | null;
  user: { fullName: string } | null;
  likeDislike: { totalLike: number } | null;
}

export interface ReviewListResult {
  productID: string;
  list: ReviewItem[];
  shop: { name: string } | null;
  hasNext: boolean;
  totalReviews: number;
}

interface ReviewListResponse {
  data: {
    productrevGetProductReviewList: ReviewListResult | null;
  };
}

const SORT_MAP: Record<string, string> = {
  most_helpful: 'informative_score desc',
  newest: 'create_time desc',
  highest_rating: 'quality desc',
  lowest_rating: 'quality asc',
};

const FILTER_MAP: Record<string, string> = {
  all: '',
  with_media: 'with_attachment=true',
  rating_5: 'rating=5',
  rating_4: 'rating=4',
  rating_3: 'rating=3',
  rating_2: 'rating=2',
  rating_1: 'rating=1',
};

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 3)}...`;
}

/**
 * Format product review results into readable markdown.
 */
export function formatProductReviews(
  result: ReviewListResult,
  page: number,
  limit: number,
  sort: string,
  filter: string,
): string {
  const { list, totalReviews, hasNext, shop } = result;
  if (!list || list.length === 0) {
    return filter && filter !== 'all'
      ? `No reviews match the "${filter}" filter for this product.`
      : 'This product has no reviews yet.';
  }

  const lines: string[] = [
    `Reviews for ${shop?.name ? `${shop.name}'s product` : 'product'}`,
    `${totalReviews.toLocaleString('id-ID')} total reviews | Page ${page} | sorted by ${sort}`,
    '',
  ];

  list.forEach((r, idx) => {
    const stars = `${'★'.repeat(Math.round(r.productRating))}${'☆'.repeat(5 - Math.round(r.productRating))}`;
    const who = r.isAnonymous ? 'Anonymous' : r.user?.fullName || 'Tokopedia user';
    const likes = r.likeDislike?.totalLike ? ` | ${r.likeDislike.totalLike} helpful` : '';

    lines.push(`${(page - 1) * limit + idx + 1}. ${stars} — **${who}**${likes}`);
    if (r.variantName) lines.push(`   Variant: ${r.variantName}`);
    if (r.message) lines.push(`   ${truncateText(r.message.replace(/\n+/g, ' ').trim(), 300)}`);
    if (r.imageAttachments && r.imageAttachments.length > 0) {
      lines.push(`   Attachments: ${r.imageAttachments.length} photo(s)`);
    }
    if (r.reviewResponse?.message) {
      lines.push(
        `   Seller reply: ${truncateText(r.reviewResponse.message.replace(/\n+/g, ' ').trim(), 200)}`,
      );
    }
    lines.push(`   Date: ${r.reviewCreateTime}`);
    if (idx < list.length - 1) lines.push('');
  });

  if (hasNext) {
    lines.push('', `Use page=${page + 1} for more reviews.`);
  }

  return lines.join('\n');
}

export function registerReviewTools(server: McpServer): void {
  server.tool(
    'get_product_reviews',
    'Get customer reviews for a Tokopedia product, including ratings, review text, variant purchased, and seller responses. Provide the numeric product ID from search_products.',
    {
      productId: z.string().min(1).describe('Numeric product ID (from search_products `id` field)'),
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('Reviews per page, max 20 (default: 10)'),
      sort: z
        .enum(['most_helpful', 'newest', 'highest_rating', 'lowest_rating'])
        .default('most_helpful')
        .describe('Sort order (default: most_helpful)'),
      filter: z
        .enum(['all', 'with_media', 'rating_5', 'rating_4', 'rating_3', 'rating_2', 'rating_1'])
        .default('all')
        .describe('Filter reviews (default: all)'),
    },
    async ({ productId, page, limit, sort, filter }) =>
      withErrorHandling(async () => {
        const currentPage = page ?? 1;
        const pageLimit = limit ?? 10;
        const sortKey = sort ?? 'most_helpful';
        const filterKey = filter ?? 'all';

        const cacheKey = tokopediaCache.key(
          'reviews',
          productId,
          currentPage,
          pageLimit,
          sortKey,
          filterKey,
        );

        const text = await tokopediaCache.getOrSet(cacheKey, async () => {
          const res = await gqlRequest<ReviewListResponse>('productReviewList', REVIEW_LIST_QUERY, {
            productID: productId,
            page: currentPage,
            limit: pageLimit,
            sortBy: SORT_MAP[sortKey] ?? 'informative_score desc',
            filterBy: FILTER_MAP[filterKey] ?? '',
          });

          const result = res.data?.productrevGetProductReviewList;
          if (!result) {
            return 'Could not load reviews for this product.';
          }

          return formatProductReviews(result, currentPage, pageLimit, sortKey, filterKey);
        });

        return textResult(text);
      }),
  );
}
