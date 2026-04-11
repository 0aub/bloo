import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BoardStore } from '../storage/board-store.js';
import { HistoryStore } from '../storage/history-store.js';
import { getElementDataSchema } from '../utils/validators.js';
import { diffElements } from '../utils/diff.js';
import type { ElementData } from '../models/elements.js';
import type { ElementType } from '../models/board.js';

const elementTypeEnum = z.enum([
  'architecture_diagram', 'db_schema', 'page_map', 'flow_chart', 'api_map',
  'sequence_diagram', 'file_tree', 'dependency_graph', 'security_layer_map',
  'cicd_pipeline', 'environment_map', 'permission_matrix', 'tech_stack',
  'note', 'text_block', 'image', 'badge',
]);

export function registerElementTools(server: McpServer, boardStore: BoardStore, historyStore: HistoryStore): void {

  // --- add_element ---
  server.tool(
    'add_element',
    'Add a diagram, note, or other visual element to a section',
    {
      board_id: z.string(),
      section_id: z.string(),
      type: elementTypeEnum.describe('Element type'),
      name: z.string().min(1).describe('Display name'),
      description: z.string().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      size: z.object({ width: z.number(), height: z.number() }).optional(),
      tags: z.array(z.string()).optional(),
      data: z.record(z.unknown()).describe('Type-specific data'),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        // Validate data against type-specific schema
        const schema = getElementDataSchema(args.type);
        if (schema) {
          schema.parse(args.data);
        }

        const element = await boardStore.addElement(args.board_id, args.section_id, {
          type: args.type as ElementType,
          name: args.name,
          description: args.description,
          position: args.position,
          size: args.size,
          tags: args.tags,
          data: args.data as unknown as ElementData,
        });

        const board = await boardStore.getBoard(args.board_id);
        const section = board.sections.find(s => s.id === args.section_id);

        await historyStore.appendChangelog(args.board_id, {
          action: 'created',
          target_type: 'element',
          target_id: element.id,
          target_name: element.name,
          element_type: element.type,
          section_id: args.section_id,
          category: section?.category || null,
          reason: args.reason || 'Element added',
          source_context: null,
          diff: null,
        });

        if (board.config.auto_snapshot) {
          board.version++;
          await boardStore.saveBoard(board);
          await historyStore.createSnapshot(board.id, board);
        }

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { element_id: element.id } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'ADD_ELEMENT_FAILED', message: e.message, suggestion: 'Check that the data matches the element type schema' } }) }] };
      }
    }
  );

  // --- update_element ---
  server.tool(
    'update_element',
    'Update an element\'s properties or data (partial merge)',
    {
      board_id: z.string(),
      element_id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      size: z.object({ width: z.number(), height: z.number() }).optional(),
      tags: z.array(z.string()).optional(),
      data: z.record(z.unknown()).optional().describe('Partial update — merged with existing data'),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        // Get element before update for diffing
        const elementBefore = await boardStore.getElement(args.board_id, args.element_id);

        const { board_id, element_id, reason, ...updates } = args;
        const { element, previousVersion } = await boardStore.updateElement(board_id, element_id, updates);

        const diff = diffElements(elementBefore, element);

        const board = await boardStore.getBoard(board_id);
        const section = board.sections.find(s => s.elements.some(e => e.id === element_id));

        await historyStore.appendChangelog(board_id, {
          action: 'updated',
          target_type: 'element',
          target_id: element_id,
          target_name: element.name,
          element_type: element.type,
          section_id: section?.id || null,
          category: section?.category || null,
          reason: reason || 'Element updated',
          source_context: null,
          diff: diff.length > 0 ? diff : null,
        });

        if (board.config.auto_snapshot) {
          board.version++;
          await boardStore.saveBoard(board);
          await historyStore.createSnapshot(board.id, board);
        }

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { updated: true, previous_version: previousVersion } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'UPDATE_ELEMENT_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- remove_element ---
  server.tool(
    'remove_element',
    'Remove an element and its connections',
    {
      board_id: z.string(),
      element_id: z.string(),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        const element = await boardStore.getElement(args.board_id, args.element_id);
        const removedConnections = await boardStore.removeElement(args.board_id, args.element_id);

        await historyStore.appendChangelog(args.board_id, {
          action: 'removed',
          target_type: 'element',
          target_id: args.element_id,
          target_name: element.name,
          element_type: element.type,
          section_id: element.section_id,
          category: null,
          reason: args.reason || 'Element removed',
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { removed: true, removed_connections: removedConnections } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'REMOVE_ELEMENT_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- get_element ---
  server.tool(
    'get_element',
    'Get a single element with optional history',
    {
      board_id: z.string(),
      element_id: z.string(),
      include_history: z.boolean().optional().describe('Include changelog entries for this element'),
    },
    async (args) => {
      try {
        const element = await boardStore.getElement(args.board_id, args.element_id);
        let history;
        if (args.include_history) {
          history = await historyStore.getElementHistory(args.board_id, args.element_id);
        }
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { element, history } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'GET_ELEMENT_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- bulk_add_elements ---
  server.tool(
    'bulk_add_elements',
    'Add multiple elements at once to reduce round trips',
    {
      board_id: z.string(),
      section_id: z.string(),
      elements: z.array(z.object({
        type: elementTypeEnum,
        name: z.string().min(1),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        data: z.record(z.unknown()),
      })),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        const inputs = args.elements.map(el => ({
          type: el.type as ElementType,
          name: el.name,
          description: el.description,
          tags: el.tags,
          data: el.data as unknown as ElementData,
        }));

        const elements = await boardStore.bulkAddElements(args.board_id, args.section_id, inputs);

        const board = await boardStore.getBoard(args.board_id);
        const section = board.sections.find(s => s.id === args.section_id);

        for (const element of elements) {
          await historyStore.appendChangelog(args.board_id, {
            action: 'created',
            target_type: 'element',
            target_id: element.id,
            target_name: element.name,
            element_type: element.type,
            section_id: args.section_id,
            category: section?.category || null,
            reason: args.reason || 'Bulk add',
            source_context: null,
            diff: null,
          });
        }

        if (board.config.auto_snapshot) {
          board.version++;
          await boardStore.saveBoard(board);
          await historyStore.createSnapshot(board.id, board);
        }

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { element_ids: elements.map(e => e.id) } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'BULK_ADD_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- bulk_update_elements ---
  server.tool(
    'bulk_update_elements',
    'Update multiple elements at once',
    {
      board_id: z.string(),
      updates: z.array(z.object({
        element_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        data: z.record(z.unknown()).optional(),
      })),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        const count = await boardStore.bulkUpdateElements(args.board_id, args.updates);

        await historyStore.appendChangelog(args.board_id, {
          action: 'updated',
          target_type: 'element',
          target_id: 'bulk',
          target_name: `${count} elements`,
          section_id: null,
          category: null,
          reason: args.reason || 'Bulk update',
          source_context: null,
          diff: null,
        });

        const board = await boardStore.getBoard(args.board_id);
        if (board.config.auto_snapshot) {
          board.version++;
          await boardStore.saveBoard(board);
          await historyStore.createSnapshot(board.id, board);
        }

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { updated_count: count } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'BULK_UPDATE_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );
}
