import { textResult, withErrorHandling } from '@kentandrian/mcp-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

const RATING_TOPICS_QUERY = `query productRatingAndTopics($productID: String!) {
  productrevGetProductRatingAndTopics(productID: $productID) {
    productID
    rating {
      positivePercentageFmt
      ratingScore
      totalRating
      totalRatingWithImage
      totalRatingTextAndImage
      detail {
        rate
        totalReviews
        formattedTotalReviews
        percentageFloat
        __typename
      }
      __typename
    }
    topics {
      rating
      ratingFmt
      formatted
      key
      reviewCount
      reviewCountFmt
      show
      __typename
    }
    availableFilters {
      withAttachment
      rating
      topics
      helpfulness
      __typename
    }
    __typename
  }
}`;

export interface RatingDetail {
  rate: number;
  totalReviews: number;
  formattedTotalReviews: string;
  percentageFloat: number;
}

export interface RatingTopic {
  rating: number;
  ratingFmt: string;
  formatted: string;
  key: string;
  reviewCount: number;
  reviewCountFmt: string;
  show: boolean;
}

export interface RatingTopicsResult {
  productID: string;
  rating: {
    positivePercentageFmt: string;
    ratingScore: string;
    totalRating: number;
    totalRatingWithImage: number;
    totalRatingTextAndImage: number;
    detail: RatingDetail[];
  } | null;
  topics: RatingTopic[] | null;
}

interface RatingTopicsResponse {
  data: {
    productrevGetProductRatingAndTopics: RatingTopicsResult | null;
  };
}

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
 * Format product rating breakdown and review topics into readable markdown.
 */
export function formatProductRatingSummary(result: RatingTopicsResult): string {
  const { rating, topics } = result;
  if (!rating) {
    return 'No rating summary available for this product.';
  }

  const lines: string[] = [
    `Rating Summary (Product ID: ${result.productID})`,
    `Score: ${rating.ratingScore} / 5.0 | ${rating.totalRating.toLocaleString('id-ID')} ratings`,
  ];

  if (rating.positivePercentageFmt) {
    lines.push(rating.positivePercentageFmt);
  }
  if (rating.totalRatingWithImage > 0 || rating.totalRatingTextAndImage > 0) {
    lines.push(
      `With media: ${rating.totalRatingWithImage.toLocaleString('id-ID')} | With text & media: ${rating.totalRatingTextAndImage.toLocaleString('id-ID')}`,
    );
  }

  if (rating.detail && rating.detail.length > 0) {
    lines.push('', 'Breakdown:');
    for (const d of rating.detail) {
      lines.push(`- ${d.rate} star: ${d.formattedTotalReviews} (${d.percentageFloat}%)`);
    }
  }

  const visibleTopics = (topics ?? []).filter((t) => t.show);
  if (visibleTopics.length > 0) {
    lines.push('', 'Review Topics:');
    for (const t of visibleTopics) {
      lines.push(`- ${t.formatted}: ${t.ratingFmt}/5 (${t.reviewCountFmt} reviews)`);
    }
  }

  return lines.join('\n');
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

  server.tool(
    'get_product_rating_summary',
    'Get rating score, star breakdown, and review topics for a Tokopedia product by its numeric product ID.',
    {
      productId: z.string().min(1).describe('Numeric product ID (from search_products `id` field)'),
    },
    async ({ productId }) =>
      withErrorHandling(async () => {
        const cacheKey = tokopediaCache.key('rating_summary', productId);
        const text = await tokopediaCache.getOrSet(cacheKey, async () => {
          const res = await gqlRequest<RatingTopicsResponse>(
            'productRatingAndTopics',
            RATING_TOPICS_QUERY,
            { productID: productId },
          );
          const result = res.data?.productrevGetProductRatingAndTopics;
          if (!result) {
            return 'Could not load rating summary for this product.';
          }
          return formatProductRatingSummary(result);
        });

        return textResult(text);
      }),
  );
}
