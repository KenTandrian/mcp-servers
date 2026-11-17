#!/usr/bin/env node
import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerNewsTools } from './tools/news.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

const server = new McpServer({
  name: 'id-news-mcp',
  version,
});

registerNewsTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
