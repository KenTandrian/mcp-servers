#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerEarthquakeTools } from './tools/earthquake.js';

const server = new McpServer({
  name: 'bmkg-mcp',
  version: '0.1.0',
});

registerEarthquakeTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
