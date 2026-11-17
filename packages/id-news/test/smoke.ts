import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXPECTED_TOOLS = ['list_news_sources', 'get_latest_news', 'search_news'];

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
  const client = new Client({ name: 'id-news-smoke', version: '0.1.0' });

  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of EXPECTED_TOOLS) {
      assert.ok(names.includes(expected), `Missing tool: ${expected}`);
    }
    console.log(`tools/list OK (${names.length} tools)`);

    const sources = getText(await client.callTool({ name: 'list_news_sources', arguments: {} }));
    assert.match(sources, /CNBC Indonesia/);
    console.log('list_news_sources OK');

    const latest = getText(
      await client.callTool({
        name: 'get_latest_news',
        arguments: { category: 'tech', limit: 3 },
      }),
    );
    assert.match(latest, /Indonesian News Digest/);
    console.log('get_latest_news OK');

    const search = getText(
      await client.callTool({
        name: 'search_news',
        arguments: { query: 'Indonesia', limit: 3 },
      }),
    );
    assert.match(search, /Indonesian News Search/);
    console.log('search_news OK');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
