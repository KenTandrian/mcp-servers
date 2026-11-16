import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCategoryTree } from '../src/tools/category.js';
import { buildFilterSortParams, formatFiltersAndSorts } from '../src/tools/filters.js';
import { formatProductRatingSummary, formatProductReviews } from '../src/tools/reviews.js';
import { formatShopInfo, formatShopProducts } from '../src/tools/shop.js';

describe('tokopedia tool formatters', () => {
  it('builds filter sort params and formats filters/sorts', () => {
    const params = new URLSearchParams(buildFilterSortParams('mouse'));
    assert.equal(params.get('q'), 'mouse');
    assert.equal(params.get('source'), 'search_product');

    const output = formatFiltersAndSorts(
      'mouse',
      [
        {
          title: 'Shop Tier',
          template_name: 'checkbox',
          options: [
            {
              name: 'Official Store',
              key: 'shop_tier',
              value: '2',
              inputType: 'checkbox',
              totalData: 500,
              isPopular: true,
              isNew: false,
            },
          ],
        },
      ],
      [{ name: 'Paling Sesuai', key: 'ob', value: '23', inputType: 'radio', applyFilter: '' }],
    );

    assert.match(output, /Paling Sesuai -> `orderBy=23`/);
    assert.match(output, /Official Store \[Popular\] -> `"shop_tier": "2"`/);
  });

  it('formats shop info and shop products', () => {
    const shopText = formatShopInfo({
      shopCore: { domain: 'logitech', shopID: '2642798', name: 'Logitech Official Store' },
      createInfo: { openSince: 'Jan 2016' },
      favoriteData: { totalFavorite: 10000 },
      activeProduct: 131,
      location: 'Jakarta Barat',
      isOpen: 1,
      shopStats: { productSold: '50rb+', totalTxSuccess: '40rb+', totalShowcase: '12' },
      statusInfo: { shopStatus: 1, statusMessage: '', statusTitle: '' },
      closedInfo: { closedNote: '', until: '' },
      goldOS: { isGold: false, isOfficial: true, badge: '', shopTier: 2 },
    });

    assert.match(shopText, /\*\*Logitech Official Store\*\* \[Official Store\]/);
    assert.match(shopText, /Status: Open/);
    assert.match(shopText, /https:\/\/www\.tokopedia\.com\/logitech/);

    const prodText = formatShopProducts(
      'Logitech Official Store',
      [
        {
          name: 'Logitech G Pro X',
          product_url: 'https://www.tokopedia.com/logitech/g-pro-x',
          product_id: '999',
          price: { text_idr: 'Rp1.999.000' },
          flags: { isSold: false },
          campaign: { discounted_percentage: 10, original_price_fmt: 'Rp2.200.000' },
          stats: { reviewCount: 42, averageRating: 4.9 },
        },
      ],
      1,
      20,
      undefined,
      true,
    );

    assert.match(prodText, /Logitech G Pro X/);
    assert.match(prodText, /Rp1\.999\.000 \(-10%\)/);
    assert.match(prodText, /Use page=2 for more results\./);
  });

  it('formats product reviews and rating summary', () => {
    const reviewsText = formatProductReviews(
      {
        productID: '123',
        shop: { name: 'Logitech' },
        hasNext: false,
        totalReviews: 1,
        list: [
          {
            id: 'r1',
            variantName: 'Black',
            message: 'Great mouse!',
            productRating: 5,
            reviewCreateTime: '2026-01-01',
            isAnonymous: false,
            imageAttachments: null,
            reviewResponse: { message: 'Thank you!', createTime: '2026-01-02' },
            user: { fullName: 'Budi' },
            likeDislike: { totalLike: 3 },
          },
        ],
      },
      1,
      10,
      'most_helpful',
      'all',
    );

    assert.match(reviewsText, /★★★★★ — \*\*Budi\*\* \| 3 helpful/);
    assert.match(reviewsText, /Variant: Black/);
    assert.match(reviewsText, /Seller reply: Thank you!/);

    const ratingText = formatProductRatingSummary({
      productID: '123',
      rating: {
        positivePercentageFmt: '100% satisfied',
        ratingScore: '5.0',
        totalRating: 10,
        totalRatingWithImage: 2,
        totalRatingTextAndImage: 1,
        detail: [{ rate: 5, totalReviews: 10, formattedTotalReviews: '10', percentageFloat: 100 }],
      },
      topics: [
        {
          rating: 5,
          ratingFmt: '5.0',
          formatted: 'Quality',
          key: 'quality',
          reviewCount: 4,
          reviewCountFmt: '4',
          show: true,
        },
      ],
    });

    assert.match(ratingText, /Score: 5\.0 \/ 5\.0 \| 10 ratings/);
    assert.match(ratingText, /- 5 star: 10 \(100%\)/);
    assert.match(ratingText, /- Quality: 5\.0\/5 \(4 reviews\)/);
  });

  it('formats category tree respecting maxDepth', () => {
    const tree = formatCategoryTree(
      [
        {
          identifier: 'electronics',
          id: '10',
          name: 'Elektronik',
          child: [
            {
              id: '101',
              name: 'Audio',
              url: 'https://www.tokopedia.com/p/elektronik/audio',
              child: [{ id: '1011', name: 'Headphone', url: '...' }],
            },
          ],
        },
      ],
      2,
    );

    assert.match(tree, /- \*\*Elektronik\*\* \(ID: 10\)/);
    assert.match(tree, /  - Audio \(ID: 101\)/);
    assert.doesNotMatch(tree, /Headphone/);
  });
});
