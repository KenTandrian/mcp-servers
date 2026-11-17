#!/usr/bin/env node
import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCategoryTools } from './tools/category.js';
import { registerFilterTools } from './tools/filters.js';
import { registerReviewTools } from './tools/reviews.js';
import { registerSearchTools } from './tools/search.js';
import { registerShopTools } from './tools/shop.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

const server = new McpServer({
  name: 'tokopedia-mcp',
  version,
});

registerSearchTools(server);
registerFilterTools(server);
registerShopTools(server);
registerReviewTools(server);
registerCategoryTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
