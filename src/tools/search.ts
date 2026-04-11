import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BoardStore } from '../storage/board-store.js';
import { HistoryStore } from '../storage/history-store.js';

export function registerSearchTools(server: McpServer, boardStore: BoardStore, historyStore: HistoryStore): void {

  // --- search_board ---
  server.tool(
    'search_board',
    'Search across all elements in a board',
    {
      board_id: z.string(),
      query: z.string().optional().describe('Free text search across names, descriptions, content'),
      type: z.enum([
        'architecture_diagram', 'db_schema', 'page_map', 'flow_chart', 'api_map',
        'sequence_diagram', 'file_tree', 'dependency_graph', 'security_layer_map',
        'cicd_pipeline', 'environment_map', 'permission_matrix', 'tech_stack',
        'note', 'text_block', 'image', 'badge',
      ]).optional(),
      tags: z.array(z.string()).optional().describe('Filter by tags (AND logic)'),
      section_id: z.string().optional(),
      status: z.enum(['current', 'stale']).optional(),
      category: z.string().optional().describe('Filter by section category'),
    },
    async (args) => {
      try {
        const board = await boardStore.getBoard(args.board_id);
        const results: Array<{
          element_id: string;
          name: string;
          type: string;
          section_id: string;
          section_name: string;
          match_context: string;
          tags: string[];
          last_updated: string;
        }> = [];

        for (const section of board.sections) {
          if (args.section_id && section.id !== args.section_id) continue;
          if (args.category && section.category !== args.category) continue;

          for (const element of section.elements) {
            // Type filter
            if (args.type && element.type !== args.type) continue;

            // Status filter
            if (args.status && element.status !== args.status) continue;

            // Tags filter (AND logic)
            if (args.tags && args.tags.length > 0) {
              const hasAll = args.tags.every(t => element.tags.includes(t));
              if (!hasAll) continue;
            }

            // Query filter
            let matchContext = '';
            if (args.query) {
              const q = args.query.toLowerCase();
              const searchFields = [
                element.name,
                element.description,
                JSON.stringify(element.data),
              ];
              const matched = searchFields.find(f => f.toLowerCase().includes(q));
              if (!matched) continue;

              // Extract context around match
              const idx = matched.toLowerCase().indexOf(q);
              const start = Math.max(0, idx - 40);
              const end = Math.min(matched.length, idx + q.length + 40);
              matchContext = (start > 0 ? '...' : '') + matched.slice(start, end) + (end < matched.length ? '...' : '');
            }

            results.push({
              element_id: element.id,
              name: element.name,
              type: element.type,
              section_id: section.id,
              section_name: section.title,
              match_context: matchContext,
              tags: element.tags,
              last_updated: element.updated_at,
            });
          }
        }

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { results } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'SEARCH_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- add_tag ---
  server.tool(
    'add_tag',
    'Add tags to an element',
    {
      board_id: z.string(),
      element_id: z.string(),
      tags: z.array(z.string()),
    },
    async (args) => {
      try {
        const updatedTags = await boardStore.addTags(args.board_id, args.element_id, args.tags);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { updated_tags: updatedTags } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'ADD_TAG_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- remove_tag ---
  server.tool(
    'remove_tag',
    'Remove tags from an element',
    {
      board_id: z.string(),
      element_id: z.string(),
      tags: z.array(z.string()),
    },
    async (args) => {
      try {
        const updatedTags = await boardStore.removeTags(args.board_id, args.element_id, args.tags);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { updated_tags: updatedTags } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'REMOVE_TAG_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );
}
