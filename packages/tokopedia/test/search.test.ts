import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSearchParams, formatSearchResults } from '../src/tools/search.js';

describe('search parameter builder and formatter', () => {
  it('builds URLSearchParams with pagination, price bounds, categoryId, and filters', () => {
    const raw = buildSearchParams({
      query: 'mechanical keyboard',
      page: 2,
      rows: 20,
      orderBy: 8,
      priceMin: 100000,
      priceMax: 500000,
      categoryId: '1759',
      source: 'directory',
      filters: { shop_tier: '2', rt: '4,5' },
    });

    const parsed = new URLSearchParams(raw);
    assert.equal(parsed.get('q'), 'mechanical keyboard');
    assert.equal(parsed.get('page'), '2');
    assert.equal(parsed.get('start'), '20');
    assert.equal(parsed.get('rows'), '20');
    assert.equal(parsed.get('ob'), '8');
    assert.equal(parsed.get('pmin'), '100000');
    assert.equal(parsed.get('pmax'), '500000');
    assert.equal(parsed.get('sc'), '1759');
    assert.equal(parsed.get('source'), 'directory');
    assert.equal(parsed.get('shop_tier'), '2');
    assert.equal(parsed.get('rt'), '4,5');
  });

  it('formats search results with badges, discounts, and free shipping', () => {
    const output = formatSearchResults(
      'Search Results for "keyboard"',
      1200,
      [
        {
          id: '101',
          name: 'Keychron K2',
          url: 'https://www.tokopedia.com/shop/keychron-k2',
          shop: { id: '1', name: 'Keychron ID', city: 'Jakarta', tier: 2 },
          price: {
            text: 'Rp1.200.000',
            number: 1200000,
            original: 'Rp1.500.000',
            discountPercentage: 20,
          },
          freeShipping: { url: 'https://example.com/fs.png' },
          rating: '4.9',
        },
        {
          id: '102',
          name: 'Budget Board',
          url: 'https://www.tokopedia.com/shop/budget-board',
          shop: { id: '2', name: 'Power Shop', city: 'Bandung', tier: 3 },
          price: { text: 'Rp300.000', number: 300000, original: '', discountPercentage: 0 },
          rating: '',
        },
      ],
      1,
      20,
    );

    assert.match(output, /Search Results for "keyboard"/);
    assert.match(output, /Page 1\/60/);
    assert.match(output, /Keychron K2/);
    assert.match(output, /Rp1\.200\.000 \(-20%\) \| Free shipping/);
    assert.match(output, /Keychron ID \[Official Store\] \(Jakarta\)/);
    assert.match(output, /Power Shop \[Power Store\] \(Bandung\)/);
    assert.match(output, /Rating: N\/A/);
  });
});
