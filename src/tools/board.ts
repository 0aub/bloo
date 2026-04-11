import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BoardStore } from '../storage/board-store.js';
import { HistoryStore } from '../storage/history-store.js';
import { validateBoardIntegrity } from '../utils/validators.js';
import { analyzeHealth } from './health.js';
import { boardToMarkdown, boardToMermaid } from '../utils/markdown-export.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { getExportPath } from '../storage/paths.js';

export function registerBoardTools(server: McpServer, boardStore: BoardStore, historyStore: HistoryStore): void {

  // --- create_board ---
  server.tool(
    'create_board',
    'Create a new documentation board for a project',
    {
      name: z.string().min(1).describe('Board display name'),
      project_path: z.string().min(1).describe('Absolute path to the project root'),
      description: z.string().optional().describe('Short description of the project'),
      theme: z.enum(['light', 'dark']).optional().describe('Default: dark'),
      tags: z.array(z.string()).optional().describe('Project-level tags'),
    },
    async (args) => {
      try {
        const board = await boardStore.createBoard(args);
        await historyStore.createSnapshot(board.id, board);
        await historyStore.appendChangelog(board.id, {
          action: 'created',
          target_type: 'board',
          target_id: board.id,
          target_name: board.name,
          section_id: null,
          category: null,
          reason: 'Board created',
          source_context: null,
          diff: null,
        });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { board_id: board.id, storage_path: path.dirname(path.dirname(board.id)) } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'CREATE_FAILED', message: e.message, suggestion: 'Check that the project path is valid' } }) }] };
      }
    }
  );

  // --- get_board ---
  server.tool(
    'get_board',
    'Retrieve the current state of a board',
    {
      board_id: z.string().describe('Board ID'),
      include_elements: z.boolean().optional().describe('Default: true. Set false for metadata only'),
    },
    async (args) => {
      try {
        const board = await boardStore.getBoard(args.board_id);
        if (args.include_elements === false) {
          for (const section of board.sections) {
            section.elements = [];
          }
        }
        const stats = {
          section_count: board.sections.length,
          element_count: board.sections.reduce((sum, s) => sum + s.elements.length, 0),
          connection_count: board.connections.length,
          last_updated: board.updated_at,
          version: board.version,
        };
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { board, stats } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'BOARD_NOT_FOUND', message: e.message, suggestion: 'Use list_boards to see available boards' } }) }] };
      }
    }
  );

  // --- list_boards ---
  server.tool(
    'list_boards',
    'List all boards managed by this server',
    {
      project_path: z.string().optional().describe('Filter by project path'),
    },
    async (args) => {
      try {
        const boards = await boardStore.listBoards(args.project_path);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { boards } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'LIST_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- delete_board ---
  server.tool(
    'delete_board',
    'Delete a board and all its history',
    {
      board_id: z.string().describe('Board ID'),
      confirm: z.literal(true).describe('Must be true to proceed'),
    },
    async (args) => {
      try {
        await boardStore.deleteBoard(args.board_id);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { deleted: true } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'DELETE_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );

  // --- export_board ---
  server.tool(
    'export_board',
    'Render the board to a viewable format (html, markdown, mermaid)',
    {
      board_id: z.string().describe('Board ID'),
      format: z.enum(['html', 'markdown', 'mermaid']).describe('Export format'),
      output_path: z.string().optional().describe('Where to save. Default: {project}/docs/board.{format}'),
      include_timeline: z.boolean().optional().describe('Include changelog timeline panel. Default: true'),
      include_minimap: z.boolean().optional().describe('Include minimap. Default: true'),
      sections: z.array(z.string()).optional().describe('Export only specific section IDs. Default: all'),
    },
    async (args) => {
      try {
        const board = await boardStore.getBoard(args.board_id);

        // Snapshot before export if configured
        if (board.config.snapshot_on_export) {
          board.version++;
          await boardStore.saveBoard(board);
          await historyStore.createSnapshot(board.id, board);
        }

        const format = args.format;

        let output: string;
        if (format === 'html') {
          const { renderBoardToHtml } = await import('../renderer/html-renderer.js');
          output = renderBoardToHtml(board, {
            includeTimeline: args.include_timeline !== false,
            includeMinimap: args.include_minimap !== false,
            sections: args.sections,
          });
        } else if (format === 'markdown') {
          output = boardToMarkdown(board);
        } else {
          output = boardToMermaid(board);
        }

        const outputPath = args.output_path || getExportPath(board.project_path, board.config.export_path, format);
        mkdirSync(path.dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, output, 'utf-8');

        const size_bytes = Buffer.byteLength(output, 'utf-8');
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { file_path: outputPath, size_bytes } }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'EXPORT_FAILED', message: e.message, suggestion: 'Ensure the output path is writable' } }) }] };
      }
    }
  );

  // --- board_health_report ---
  server.tool(
    'board_health_report',
    'Analyze documentation coverage and staleness',
    {
      board_id: z.string().describe('Board ID'),
    },
    async (args) => {
      try {
        const board = await boardStore.getBoard(args.board_id);
        const report = analyzeHealth(board);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: report }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'HEALTH_REPORT_FAILED', message: e.message, suggestion: 'Use list_boards to verify board exists' } }) }] };
      }
    }
  );

  // --- validate_board ---
  server.tool(
    'validate_board',
    'Check board data integrity',
    {
      board_id: z.string().describe('Board ID'),
    },
    async (args) => {
      try {
        const board = await boardStore.getBoard(args.board_id);
        const result = validateBoardIntegrity(board);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, data: result }) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: { code: 'VALIDATE_FAILED', message: e.message, suggestion: '' } }) }] };
      }
    }
  );
}
