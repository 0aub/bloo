import { Router } from 'express';
import type { BoardStore } from '../storage/board-store.js';
import type { HistoryStore } from '../storage/history-store.js';
import { getRenderer } from '../renderer/diagram-renderers/index.js';
import { renderBoardToHtml } from '../renderer/html-renderer.js';
import { boardToMarkdown, boardToMermaid } from '../utils/markdown-export.js';
import { getElementDataSchema } from '../utils/validators.js';
import type { ElementType } from '../models/board.js';
import type { ElementData } from '../models/elements.js';

export function createRouter(boardStore: BoardStore, historyStore: HistoryStore): Router {
  const router = Router();

  // --- Boards ---
  router.get('/api/boards', async (req, res) => {
    try {
      const projectPath = req.query.project_path as string | undefined;
      const boards = await boardStore.listBoards(projectPath);
      res.json({ success: true, data: { boards } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/api/boards/:id', async (req, res) => {
    try {
      const board = await boardStore.getBoard(req.params.id);
      const stats = {
        section_count: board.sections.length,
        element_count: board.sections.reduce((sum, s) => sum + s.elements.length, 0),
        connection_count: board.connections.length,
      };
      res.json({ success: true, data: { board, stats } });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  });

  router.post('/api/boards', async (req, res) => {
    try {
      const board = await boardStore.createBoard(req.body);
      await historyStore.createSnapshot(board.id, board);
      res.json({ success: true, data: { board_id: board.id } });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  router.delete('/api/boards/:id', async (req, res) => {
    try {
      await boardStore.deleteBoard(req.params.id);
      res.json({ success: true, data: { deleted: true } });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  });

  // --- Sections ---
  router.post('/api/boards/:id/sections', async (req, res) => {
    try {
      const section = await boardStore.addSection(req.params.id, req.body);
      res.json({ success: true, data: { section_id: section.id } });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  router.put('/api/boards/:boardId/sections/:secId', async (req, res) => {
    try {
      await boardStore.updateSection(req.params.boardId, req.params.secId, req.body);
      res.json({ success: true, data: { updated: true } });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  router.delete('/api/boards/:boardId/sections/:secId', async (req, res) => {
    try {
      const removed = await boardStore.removeSection(req.params.boardId, req.params.secId, true);
      res.json({ success: true, data: { removed: true, removed_elements: removed } });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // --- Elements ---
  router.post('/api/boards/:id/elements', async (req, res) => {
    try {
      const { section_id, type, name, description, position, size, tags, data, reason } = req.body;
      const schema = getElementDataSchema(type);
      if (schema) schema.parse(data);
      const element = await boardStore.addElement(req.params.id, section_id, {
        type: type as ElementType,
        name, description, position, size, tags,
        data: data as unknown as ElementData,
      });
      res.json({ success: true, data: { element_id: element.id } });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  router.put('/api/boards/:boardId/elements/:elId', async (req, res) => {
    try {
      const { element } = await boardStore.updateElement(req.params.boardId, req.params.elId, req.body);
      res.json({ success: true, data: { updated: true, element_id: element.id } });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  router.delete('/api/boards/:boardId/elements/:elId', async (req, res) => {
    try {
      const removedConns = await boardStore.removeElement(req.params.boardId, req.params.elId);
      res.json({ success: true, data: { removed: true, removed_connections: removedConns } });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // --- Render SVG ---
  router.get('/api/boards/:boardId/render/:elId', async (req, res) => {
    try {
      const element = await boardStore.getElement(req.params.boardId, req.params.elId);
      const renderer = getRenderer(element.type);
      const svgContent = renderer.render(element);
      const size = renderer.calculateSize(element);
      const svg = `<svg viewBox="0 0 ${size.width} ${size.height}" width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
      res.set('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  });

  // --- Export ---
  router.get('/api/boards/:id/export', async (req, res) => {
    try {
      const board = await boardStore.getBoard(req.params.id);
      const format = (req.query.format as string) || 'html';

      if (format === 'html') {
        const html = renderBoardToHtml(board, {});
        res.set('Content-Type', 'text/html');
        res.set('Content-Disposition', `attachment; filename="${board.name}.html"`);
        res.send(html);
      } else if (format === 'markdown') {
        const md = boardToMarkdown(board);
        res.set('Content-Type', 'text/markdown');
        res.set('Content-Disposition', `attachment; filename="${board.name}.md"`);
        res.send(md);
      } else if (format === 'mermaid') {
        const mm = boardToMermaid(board);
        res.set('Content-Type', 'text/plain');
        res.send(mm);
      } else {
        res.status(400).json({ success: false, error: `Unknown format: ${format}` });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- History ---
  router.get('/api/boards/:id/history', async (req, res) => {
    try {
      const result = await historyStore.getChangelog(req.params.id, {
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      });
      res.json({ success: true, data: result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/api/boards/:id/timeline', async (req, res) => {
    try {
      const granularity = (req.query.granularity as 'day' | 'week' | 'month') || 'day';
      const entries = await historyStore.getTimeline(req.params.id, granularity);
      res.json({ success: true, data: { entries } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Search ---
  router.post('/api/boards/:id/search', async (req, res) => {
    try {
      const board = await boardStore.getBoard(req.params.id);
      const { query, type, tags, section_id, status, category } = req.body;
      const results: any[] = [];

      for (const section of board.sections) {
        if (section_id && section.id !== section_id) continue;
        if (category && section.category !== category) continue;
        for (const element of section.elements) {
          if (type && element.type !== type) continue;
          if (status && element.status !== status) continue;
          if (tags && tags.length > 0 && !tags.every((t: string) => element.tags.includes(t))) continue;
          if (query) {
            const haystack = (element.name + ' ' + element.description + ' ' + JSON.stringify(element.data)).toLowerCase();
            if (!haystack.includes(query.toLowerCase())) continue;
          }
          results.push({
            element_id: element.id,
            name: element.name,
            type: element.type,
            section_id: section.id,
            section_name: section.title,
            tags: element.tags,
          });
        }
      }
      res.json({ success: true, data: { results } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}
