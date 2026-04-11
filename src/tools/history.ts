import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BoardStore } from '../storage/board-store.js';
import { HistoryStore } from '../storage/history-store.js';
import { diffBoards } from '../utils/diff.js';

export function registerHistoryTools(server: McpServer, boardStore: BoardStore, historyStore: HistoryStore): void {

  // --- get_history ---
  server.tool(
    'get_history',
    'Get changelog entries with optional filters',
    {
      board_id: z.string(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      element_id: z.string().optional(),
      section_id: z.string().optional(),
      action: z.enum(['created', 'updated', 'removed']).optional(),
      limit: z.number().optional().describe('Default: 50'),
      offset: z.number().optional().describe('Default: 0'),
    },
    async (args) => {
      try {
        const result = await historyStore.getChangelog(args.board_id, args);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: result }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'GET_HISTORY_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- get_element_history ---
  server.tool(
    'get_element_history',
    'Get all changelog entries for a specific element',
    {
      board_id: z.string(),
      element_id: z.string(),
    },
    async (args) => {
      try {
        const entries = await historyStore.getElementHistory(args.board_id, args.element_id);
        const created_at = entries.length > 0 ? entries[0].timestamp : null;
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { entries, created_at, update_count: entries.length } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'GET_ELEMENT_HISTORY_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- add_milestone ---
  server.tool(
    'add_milestone',
    'Mark a significant point in the project evolution',
    {
      board_id: z.string(),
      name: z.string().describe('Lowercase slug, e.g., "v2-launch", "pre-refactor"'),
      description: z.string().optional(),
    },
    async (args) => {
      try {
        const board = await boardStore.getBoard(args.board_id);
        board.version++;
        await boardStore.saveBoard(board);
        const version = await historyStore.createSnapshot(board.id, board);
        const milestone = await historyStore.createMilestone(board.id, args.name, args.description || '', board.version);

        await historyStore.appendChangelog(args.board_id, {
          action: 'created',
          target_type: 'board',
          target_id: args.board_id,
          target_name: `Milestone: ${args.name}`,
          section_id: null,
          category: null,
          reason: args.description || `Milestone ${args.name} created`,
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { milestone_name: milestone.name, snapshot_version: milestone.version } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'ADD_MILESTONE_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- get_snapshot ---
  server.tool(
    'get_snapshot',
    'Retrieve a board snapshot by version number or milestone name',
    {
      board_id: z.string(),
      version: z.number().optional().describe('Snapshot version number'),
      milestone: z.string().optional().describe('Or milestone name'),
    },
    async (args) => {
      try {
        let snapshot;
        if (args.milestone) {
          snapshot = await historyStore.getSnapshotByMilestone(args.board_id, args.milestone);
        } else if (args.version !== undefined) {
          snapshot = await historyStore.getSnapshot(args.board_id, args.version);
        } else {
          throw new Error('Provide either version or milestone');
        }
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { board: snapshot.board, version: snapshot.version, timestamp: snapshot.timestamp } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'GET_SNAPSHOT_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- compare_snapshots ---
  server.tool(
    'compare_snapshots',
    'Diff two board versions or milestones',
    {
      board_id: z.string(),
      from_version: z.union([z.number(), z.string()]).describe('Version number or milestone name'),
      to_version: z.union([z.number(), z.string()]).describe('Version number or milestone name'),
    },
    async (args) => {
      try {
        const resolveVersion = async (v: number | string): Promise<number> => {
          if (typeof v === 'number') return v;
          return historyStore.getMilestoneVersion(args.board_id, v);
        };

        const fromVersion = await resolveVersion(args.from_version);
        const toVersion = await resolveVersion(args.to_version);

        const fromSnapshot = await historyStore.getSnapshot(args.board_id, fromVersion);
        const toSnapshot = await historyStore.getSnapshot(args.board_id, toVersion);

        const comparison = diffBoards(fromSnapshot.board, toSnapshot.board);

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: comparison }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'COMPARE_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- add_decision ---
  server.tool(
    'add_decision',
    'Record an architectural decision (lightweight ADR)',
    {
      board_id: z.string(),
      title: z.string().min(1),
      context: z.string().min(1).describe('Why this decision was needed'),
      decision: z.string().min(1).describe('What was decided'),
      alternatives: z.array(z.string()).optional(),
      consequences: z.string().optional(),
      related_elements: z.array(z.string()).optional().describe('Element IDs this decision affects'),
      status: z.enum(['proposed', 'accepted', 'superseded', 'deprecated']).optional(),
    },
    async (args) => {
      try {
        const decision = await historyStore.addDecision(args.board_id, args);

        await historyStore.appendChangelog(args.board_id, {
          action: 'created',
          target_type: 'decision',
          target_id: decision.id,
          target_name: decision.title,
          section_id: null,
          category: null,
          reason: decision.context,
          source_context: null,
          diff: null,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { decision_id: decision.id } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'ADD_DECISION_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- get_decisions ---
  server.tool(
    'get_decisions',
    'Get architectural decisions with optional filters',
    {
      board_id: z.string(),
      status: z.string().optional(),
      element_id: z.string().optional().describe('Get decisions related to an element'),
    },
    async (args) => {
      try {
        const decisions = await historyStore.getDecisions(args.board_id, {
          status: args.status,
          elementId: args.element_id,
        });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { decisions } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'GET_DECISIONS_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- get_timeline ---
  server.tool(
    'get_timeline',
    'Get a high-level timeline for rendering in the board',
    {
      board_id: z.string(),
      granularity: z.enum(['day', 'week', 'month']).optional().describe('Default: day'),
    },
    async (args) => {
      try {
        const entries = await historyStore.getTimeline(args.board_id, args.granularity || 'day');
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { entries } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'GET_TIMELINE_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );
}
