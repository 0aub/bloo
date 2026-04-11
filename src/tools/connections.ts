import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BoardStore } from '../storage/board-store.js';
import { HistoryStore } from '../storage/history-store.js';

export function registerConnectionTools(server: McpServer, boardStore: BoardStore, historyStore: HistoryStore): void {

  // --- add_connection ---
  server.tool(
    'add_connection',
    'Draw a visual connection between any two elements',
    {
      board_id: z.string(),
      from_element_id: z.string(),
      to_element_id: z.string(),
      label: z.string().optional(),
      style: z.enum(['solid', 'dashed', 'dotted']).optional(),
      color: z.string().optional(),
      arrow: z.enum(['forward', 'backward', 'both', 'none']).optional(),
      metadata: z.object({
        protocol: z.string().optional(),
        data_format: z.string().optional(),
        async: z.boolean().optional(),
        description: z.string().optional(),
      }).optional(),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        const connection = await boardStore.addConnection(args.board_id, {
          from_element_id: args.from_element_id,
          to_element_id: args.to_element_id,
          label: args.label,
          style: args.style,
          color: args.color,
          arrow: args.arrow,
          metadata: args.metadata,
        });

        await historyStore.appendChangelog(args.board_id, {
          action: 'connected',
          target_type: 'connection',
          target_id: connection.id,
          target_name: connection.label || `${args.from_element_id} → ${args.to_element_id}`,
          section_id: null,
          category: null,
          reason: args.reason || 'Connection added',
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { connection_id: connection.id } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'ADD_CONNECTION_FAILED', message: e.message, suggestion: 'Verify both element IDs exist' } }) }] };
      }
    }
  );

  // --- update_connection ---
  server.tool(
    'update_connection',
    'Update a connection\'s properties',
    {
      board_id: z.string(),
      connection_id: z.string(),
      label: z.string().optional(),
      style: z.enum(['solid', 'dashed', 'dotted']).optional(),
      color: z.string().optional(),
      metadata: z.record(z.string()).optional(),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        const { board_id, connection_id, reason, ...updates } = args;
        await boardStore.updateConnection(board_id, connection_id, updates);

        await historyStore.appendChangelog(board_id, {
          action: 'updated',
          target_type: 'connection',
          target_id: connection_id,
          target_name: args.label || connection_id,
          section_id: null,
          category: null,
          reason: reason || 'Connection updated',
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { updated: true } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'UPDATE_CONNECTION_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- remove_connection ---
  server.tool(
    'remove_connection',
    'Remove a connection between elements',
    {
      board_id: z.string(),
      connection_id: z.string(),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        await boardStore.removeConnection(args.board_id, args.connection_id);

        await historyStore.appendChangelog(args.board_id, {
          action: 'disconnected',
          target_type: 'connection',
          target_id: args.connection_id,
          target_name: args.connection_id,
          section_id: null,
          category: null,
          reason: args.reason || 'Connection removed',
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { removed: true } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'REMOVE_CONNECTION_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- add_cross_reference ---
  server.tool(
    'add_cross_reference',
    'Create a semantic link between related elements in different sections',
    {
      board_id: z.string(),
      from_element_id: z.string(),
      to_element_id: z.string(),
      relationship: z.string().min(1).describe('e.g., "implements", "reads_from", "secured_by"'),
      description: z.string().optional(),
      bidirectional: z.boolean().optional(),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        const ref = await boardStore.addCrossReference(args.board_id, {
          from_element_id: args.from_element_id,
          to_element_id: args.to_element_id,
          relationship: args.relationship,
          description: args.description,
          bidirectional: args.bidirectional,
        });

        await historyStore.appendChangelog(args.board_id, {
          action: 'connected',
          target_type: 'cross_reference',
          target_id: ref.id,
          target_name: `${args.relationship}: ${args.from_element_id} → ${args.to_element_id}`,
          section_id: null,
          category: null,
          reason: args.reason || 'Cross-reference added',
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { reference_id: ref.id } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'ADD_CROSS_REF_FAILED', message: e.message, suggestion: 'Verify both element IDs exist' } }) }] };
      }
    }
  );

  // --- add_board_link ---
  server.tool(
    'add_board_link',
    'Link to another project\'s board',
    {
      board_id: z.string(),
      target_board_id: z.string(),
      label: z.string().min(1).describe('e.g., "Backend API", "Shared Library"'),
      description: z.string().optional(),
      element_id: z.string().optional().describe('Attach this link to a specific element'),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        const link = await boardStore.addBoardLink(args.board_id, {
          target_board_id: args.target_board_id,
          label: args.label,
          description: args.description,
          element_id: args.element_id,
        });

        await historyStore.appendChangelog(args.board_id, {
          action: 'connected',
          target_type: 'board' as any,
          target_id: link.id,
          target_name: `Board link: ${args.label}`,
          section_id: null,
          category: null,
          reason: args.reason || 'Board link added',
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { link_id: link.id } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'ADD_BOARD_LINK_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );
}
