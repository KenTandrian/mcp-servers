import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXPECTED_TOOLS = ['get_idr_exchange_rate', 'get_crypto_prices_idr', 'compare_crypto_idr'];

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
  const client = new Client({ name: 'id-finance-smoke', version: '0.1.0' });

  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of EXPECTED_TOOLS) {
      assert.ok(names.includes(expected), `Missing tool: ${expected}`);
    }
    console.log(`tools/list OK (${names.length} tools)`);

    const fxText = getText(
      await client.callTool({
        name: 'get_idr_exchange_rate',
        arguments: { currency: 'USD' },
      }),
    );
    assert.match(fxText, /Bank Indonesia Kurs Transaksi: \*\*USD\/IDR\*\*/);
    console.log('get_idr_exchange_rate OK');

    const cryptoText = getText(
      await client.callTool({
        name: 'get_crypto_prices_idr',
        arguments: { exchange: 'all', symbols: ['BTC', 'ETH'], limit: 10 },
      }),
    );
    assert.match(cryptoText, /BTC\/IDR/);
    console.log('get_crypto_prices_idr OK');

    const cmpText = getText(
      await client.callTool({
        name: 'compare_crypto_idr',
        arguments: { symbol: 'BTC' },
      }),
    );
    assert.match(cmpText, /BTC\/IDR\*\* Exchange Comparison/);
    console.log('compare_crypto_idr OK');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
