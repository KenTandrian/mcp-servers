#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerBiKursTools } from './tools/bi-kurs.js';

const server = new McpServer({
  name: 'id-finance-mcp',
  version: '0.1.0',
});

registerBiKursTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
