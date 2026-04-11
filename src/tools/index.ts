import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BoardStore } from '../storage/board-store.js';
import { HistoryStore } from '../storage/history-store.js';
import { registerBoardTools } from './board.js';
import { registerSectionTools } from './sections.js';
import { registerElementTools } from './elements.js';
import { registerConnectionTools } from './connections.js';
import { registerHistoryTools } from './history.js';
import { registerSearchTools } from './search.js';

export function registerAllTools(server: McpServer, boardStore: BoardStore, historyStore: HistoryStore): void {
  registerBoardTools(server, boardStore, historyStore);
  registerSectionTools(server, boardStore, historyStore);
  registerElementTools(server, boardStore, historyStore);
  registerConnectionTools(server, boardStore, historyStore);
  registerHistoryTools(server, boardStore, historyStore);
  registerSearchTools(server, boardStore, historyStore);
}
