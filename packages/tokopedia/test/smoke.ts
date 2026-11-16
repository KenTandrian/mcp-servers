import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXPECTED_TOOLS = [
  'search_products',
  'get_filters_and_sorts',
  'get_shop_info',
  'get_shop_products',
  'get_product_reviews',
  'get_product_rating_summary',
  'get_category_tree',
  'browse_category',
];

function getText(result: Awaited<ReturnType<Client['callTool']>>): string {
  assert.notEqual(result.isError, true, `Unexpected tool error: ${JSON.stringify(result)}`);
  const content = result.content as Array<{ type: string; text?: string }>;
  assert.ok(content.length > 0 && content[0]?.type === 'text' && content[0].text);
  return content[0].text;
}

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js'],
  });
  const client = new Client({ name: 'tokopedia-smoke', version: '0.1.0' });

  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of EXPECTED_TOOLS) {
      assert.ok(names.includes(expected), `Missing tool: ${expected}`);
    }
    console.log(`tools/list OK (${names.length} tools)`);

    const searchText = getText(
      await client.callTool({ name: 'search_products', arguments: { query: 'mouse', rows: 2 } }),
    );
    assert.match(searchText, /Search Results for/);
    console.log('search_products OK');

    const filtersText = getText(
      await client.callTool({ name: 'get_filters_and_sorts', arguments: { query: 'mouse' } }),
    );
    assert.match(filtersText, /Filters & sorts for "mouse"/);
    console.log('get_filters_and_sorts OK');

    const shopText = getText(
      await client.callTool({ name: 'get_shop_info', arguments: { shopDomain: 'logitech' } }),
    );
    assert.match(shopText, /Logitech Official Store/);
    console.log('get_shop_info OK');

    const shopProductsText = getText(
      await client.callTool({
        name: 'get_shop_products',
        arguments: { shopDomain: 'logitech', perPage: 2 },
      }),
    );
    assert.match(shopProductsText, /Products from/);
    console.log('get_shop_products OK');

    const idMatch = shopProductsText.match(/ID:\s*(\d+)/);
    assert.ok(idMatch?.[1], 'Expected a product ID from get_shop_products');
    const productId = idMatch[1];

    const reviewsText = getText(
      await client.callTool({
        name: 'get_product_reviews',
        arguments: { productId, limit: 2 },
      }),
    );
    assert.ok(reviewsText.length > 0);
    console.log('get_product_reviews OK');

    const ratingText = getText(
      await client.callTool({
        name: 'get_product_rating_summary',
        arguments: { productId },
      }),
    );
    assert.match(ratingText, /Rating Summary/);
    console.log('get_product_rating_summary OK');

    const catText = getText(
      await client.callTool({ name: 'get_category_tree', arguments: { depth: 1 } }),
    );
    assert.match(catText, /Tokopedia Category Tree/);
    console.log('get_category_tree OK');

    const browseText = getText(
      await client.callTool({
        name: 'browse_category',
        arguments: { categoryId: '1759', rows: 2 },
      }),
    );
    assert.match(browseText, /Category 1759/);
    console.log('browse_category OK');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
