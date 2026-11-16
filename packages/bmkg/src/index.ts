#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerEarthquakeTools } from './tools/earthquake.js';
import { registerWeatherTools } from './tools/weather.js';
import { registerWilayahTools } from './tools/wilayah.js';

const server = new McpServer({
  name: 'bmkg-mcp',
  version: '0.1.0',
});

registerEarthquakeTools(server);
registerWeatherTools(server);
registerWilayahTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
