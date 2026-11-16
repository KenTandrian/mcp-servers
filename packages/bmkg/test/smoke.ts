import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXPECTED_TOOLS = [
  'get_latest_earthquake',
  'get_recent_earthquakes',
  'get_weather_forecast',
  'list_regions',
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
  const client = new Client({ name: 'bmkg-smoke', version: '0.1.0' });

  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of EXPECTED_TOOLS) {
      assert.ok(names.includes(expected), `Missing tool: ${expected}`);
    }
    console.log(`tools/list OK (${names.length} tools)`);

    const latestEq = getText(
      await client.callTool({ name: 'get_latest_earthquake', arguments: {} }),
    );
    assert.match(latestEq, /Latest BMKG Earthquake/);
    console.log('get_latest_earthquake OK');

    const recentEq = getText(
      await client.callTool({
        name: 'get_recent_earthquakes',
        arguments: { type: 'm5_plus', limit: 2 },
      }),
    );
    assert.match(recentEq, /Recent M5\.0\+ Earthquakes/);
    console.log('get_recent_earthquakes OK');

    const weather = getText(
      await client.callTool({
        name: 'get_weather_forecast',
        arguments: { adm4: '31.71.03.1001', days: 1 },
      }),
    );
    assert.match(weather, /Weather Forecast: \*\*Kemayoran/);
    console.log('get_weather_forecast OK');

    const regions = getText(
      await client.callTool({
        name: 'list_regions',
        arguments: { level: 'provinces', query: 'jakarta' },
      }),
    );
    assert.match(regions, /DKI Jakarta/);
    console.log('list_regions OK');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
