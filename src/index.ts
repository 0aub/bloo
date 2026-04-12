#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardStore } from './storage/board-store.js';
import { HistoryStore } from './storage/history-store.js';
import { registerAllTools } from './tools/index.js';
import { createRouter } from './http/router.js';

const log = (msg: string) => process.stderr.write(`[bloo] ${msg}\n`);

// Shared stores
const boardStore = new BoardStore();
const historyStore = new HistoryStore();

// --- MCP Server (stdio) ---
const mcpServer = new McpServer(
  { name: 'bloo', version: '2.0.0' },
);
registerAllTools(mcpServer, boardStore, historyStore);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
log('MCP server running via stdio');

// --- HTTP Server (Express) ---
const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// API routes
app.use(createRouter(boardStore, historyStore));

// Serve React frontend (static files from dist/public)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SPA fallback: serve index.html for all non-API routes
app.use((req: any, res: any, next: any) => {
  if (!req.path.startsWith('/api/') && req.method === 'GET') {
    res.sendFile(path.join(publicDir, 'index.html'), (err: any) => {
      if (err) next();
    });
  } else {
    next();
  }
});

const port = parseInt(process.env.BLOO_HTTP_PORT || '3000');
app.listen(port, '0.0.0.0', () => {
  log(`HTTP server running on http://0.0.0.0:${port}`);
});
