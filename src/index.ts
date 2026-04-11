#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BoardStore } from './storage/board-store.js';
import { HistoryStore } from './storage/history-store.js';
import { registerAllTools } from './tools/index.js';

const log = (msg: string) => process.stderr.write(`[bloo] ${msg}\n`);

const server = new McpServer(
  { name: 'bloo', version: '1.0.0' },
);

const boardStore = new BoardStore();
const historyStore = new HistoryStore();

registerAllTools(server, boardStore, historyStore);

const transport = new StdioServerTransport();
await server.connect(transport);

log('Bloo MCP server running via stdio');
