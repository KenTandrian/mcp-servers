#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerFilterTools } from './tools/filters.js';
import { registerSearchTools } from './tools/search.js';
import { registerShopTools } from './tools/shop.js';

const server = new McpServer({
  name: 'tokopedia-mcp',
  version: '0.1.0',
});

registerSearchTools(server);
registerFilterTools(server);
registerShopTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
