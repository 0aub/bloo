#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db/connection.js';
import { initSchema } from './db/schema.js';
import { BoardStore } from './storage/board-store.js';
import { HistoryStore } from './storage/history-store.js';
import { registerAllTools } from './tools/index.js';
import { createRouter } from './http/router.js';

const log = (msg: string) => process.stderr.write(`[bloo] ${msg}\n`);

// --- Initialize database ---
const db = getDb();
initSchema(db);
log('SQLite database initialized');

// Shared stores
const boardStore = new BoardStore();
const historyStore = new HistoryStore();

// --- HTTP Server (Express) ---
const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS
app.use((req: any, res: any, next: any) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// API routes
app.use(createRouter(boardStore, historyStore));

// --- MCP over SSE ---
const mcpTransports = new Map<string, SSEServerTransport>();

app.get('/mcp/sse', async (req: any, res: any) => {
  log('MCP SSE client connected');
  const transport = new SSEServerTransport('/mcp/messages', res);
  const sessionId = transport.sessionId;
  mcpTransports.set(sessionId, transport);

  const mcpServer = new McpServer({ name: 'bloo', version: '3.0.0' });
  registerAllTools(mcpServer, boardStore, historyStore);
  await mcpServer.connect(transport);

  req.on('close', () => {
    mcpTransports.delete(sessionId);
    log('MCP SSE client disconnected');
  });
});

app.post('/mcp/messages', async (req: any, res: any) => {
  const sessionId = req.query.sessionId as string;
  const transport = mcpTransports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  await transport.handlePostMessage(req, res);
});

// Serve React frontend (static files from dist/public)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SPA fallback
app.use((req: any, res: any, next: any) => {
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/mcp/') && req.method === 'GET') {
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
  log(`MCP SSE endpoint: http://0.0.0.0:${port}/mcp/sse`);
  log(`Web UI: http://0.0.0.0:${port}`);
});
