import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BoardStore } from '../storage/board-store.js';
import { HistoryStore } from '../storage/history-store.js';
import type { Section } from '../models/board.js';
import { diffElements } from '../utils/diff.js';

export function registerSectionTools(server: McpServer, boardStore: BoardStore, historyStore: HistoryStore): void {

  // --- add_section ---
  server.tool(
    'add_section',
    'Add a section (frame/group) to the board',
    {
      board_id: z.string(),
      title: z.string().min(1).describe('Section display name'),
      category: z.enum(['system_structure', 'data_layer', 'api_integration', 'security', 'infrastructure', 'user_flows', 'processes', 'project_meta']),
      description: z.string().optional(),
      parent_section_id: z.string().optional().describe('For nested sub-sections'),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      color: z.string().optional().describe('Hex color. Auto-assigned by category if omitted'),
      collapsed: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      reason: z.string().optional().describe('Why this section is being added'),
    },
    async (args) => {
      try {
        const section = await boardStore.addSection(args.board_id, args);

        await historyStore.appendChangelog(args.board_id, {
          action: 'created',
          target_type: 'section',
          target_id: section.id,
          target_name: section.title,
          section_id: section.id,
          category: section.category,
          reason: args.reason || 'Section added',
          source_context: null,
          diff: null,
        });

        // Auto-snapshot
        const board = await boardStore.getBoard(args.board_id);
        if (board.config.auto_snapshot) {
          board.version++;
          await boardStore.saveBoard(board);
          await historyStore.createSnapshot(board.id, board);
        }

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { section_id: section.id } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'ADD_SECTION_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- update_section ---
  server.tool(
    'update_section',
    'Update a section\'s properties',
    {
      board_id: z.string(),
      section_id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      color: z.string().optional(),
      collapsed: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        const { board_id, section_id, reason, ...updates } = args;
        const section = await boardStore.updateSection(board_id, section_id, updates);

        await historyStore.appendChangelog(board_id, {
          action: 'updated',
          target_type: 'section',
          target_id: section_id,
          target_name: section.title,
          section_id: section_id,
          category: section.category,
          reason: reason || 'Section updated',
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { updated: true } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'UPDATE_SECTION_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- remove_section ---
  server.tool(
    'remove_section',
    'Remove a section and optionally its child elements',
    {
      board_id: z.string(),
      section_id: z.string(),
      remove_children: z.boolean().optional().describe('Also remove all elements in this section. Default: true'),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        // Get section name before removal
        const board = await boardStore.getBoard(args.board_id);
        const section = board.sections.find(s => s.id === args.section_id);
        const sectionName = section?.title || args.section_id;
        const sectionCategory = section?.category || null;

        const removedElements = await boardStore.removeSection(args.board_id, args.section_id, args.remove_children !== false);

        await historyStore.appendChangelog(args.board_id, {
          action: 'removed',
          target_type: 'section',
          target_id: args.section_id,
          target_name: sectionName,
          section_id: args.section_id,
          category: sectionCategory,
          reason: args.reason || 'Section removed',
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { removed: true, removed_elements: removedElements } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'REMOVE_SECTION_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- set_layout ---
  server.tool(
    'set_layout',
    'Auto-arrange elements within a section',
    {
      board_id: z.string(),
      section_id: z.string(),
      layout: z.enum(['grid', 'horizontal', 'vertical', 'tree', 'force', 'freeform']),
      spacing: z.number().optional().describe('Pixels between elements. Default: 40'),
    },
    async (args) => {
      try {
        const board = await boardStore.getBoard(args.board_id);
        const section = board.sections.find(s => s.id === args.section_id);
        if (!section) throw new Error(`Section not found: ${args.section_id}`);

        const spacing = args.spacing || 40;
        let updatedPositions = 0;

        // Simple layout implementations
        const elements = section.elements;
        if (args.layout === 'grid') {
          const cols = Math.ceil(Math.sqrt(elements.length));
          elements.forEach((el, i) => {
            el.position = {
              x: (i % cols) * (el.size.width + spacing),
              y: Math.floor(i / cols) * (el.size.height + spacing),
            };
            updatedPositions++;
          });
        } else if (args.layout === 'horizontal') {
          let x = 0;
          for (const el of elements) {
            el.position = { x, y: 0 };
            x += el.size.width + spacing;
            updatedPositions++;
          }
        } else if (args.layout === 'vertical') {
          let y = 0;
          for (const el of elements) {
            el.position = { x: 0, y };
            y += el.size.height + spacing;
            updatedPositions++;
          }
        }
        // For tree, force, freeform — defer to renderer layout engine

        await boardStore.saveBoard(board);

        await historyStore.appendChangelog(args.board_id, {
          action: 'updated',
          target_type: 'section',
          target_id: args.section_id,
          target_name: section.title,
          section_id: args.section_id,
          category: section.category,
          reason: `Layout changed to ${args.layout}`,
          source_context: null,
          diff: [{ field: 'layout', old_value: null, new_value: args.layout }],
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { updated_positions: updatedPositions } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'SET_LAYOUT_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );
}
