#!/usr/bin/env node
import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerBiKursTools } from './tools/bi-kurs.js';
import { registerCryptoTools } from './tools/crypto.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

const server = new McpServer({
  name: 'id-finance-mcp',
  version,
});

registerBiKursTools(server);
registerCryptoTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
