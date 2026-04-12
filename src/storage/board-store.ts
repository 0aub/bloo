import type {
  Board, Section, Element, BoardConfig, BoardIndexEntry,
  SectionCategory, ElementType, ElementStatus, Position, Size,
} from '../models/board.js';
import { DEFAULT_BOARD_CONFIG } from '../models/board.js';
import type { Connection, ConnectionMetadata, CrossReference, BoardLink } from '../models/connections.js';
import type { ElementData } from '../models/elements.js';
import { getDb } from '../db/connection.js';
import {
  generateBoardId, generateSectionId, generateElementId,
  generateConnectionId, generateCrossRefId, generateBoardLinkId,
} from '../utils/id-generator.js';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

function generateProjectId(): string {
  return `proj_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

/** Parse a JSON TEXT column, returning fallback on null / empty. */
function parseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

// Resolve flat sections into tree structure
function resolveSectionTree(sections: Section[]): Section[] {
  const map = new Map<string, Section>();
  for (const s of sections) {
    map.set(s.id, { ...s, children_sections: [] });
  }
  for (const s of map.values()) {
    if (s.parent_section_id && map.has(s.parent_section_id)) {
      map.get(s.parent_section_id)!.children_sections.push(s);
    }
  }
  return sections.map(s => map.get(s.id)!);
}

// ---------------------------------------------------------------------------
// Row  -> Model mappers
// ---------------------------------------------------------------------------

function rowToSection(row: any): Section {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category as SectionCategory,
    parent_section_id: row.parent_section_id ?? null,
    position: { x: row.position_x ?? 0, y: row.position_y ?? 0 },
    size: { width: row.width ?? 600, height: row.height ?? 400 },
    color: row.color ?? '',
    collapsed: !!row.collapsed,
    tags: parseJSON<string[]>(row.tags, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
    elements: [],
    children_sections: [],
  };
}

function rowToElement(row: any): Element {
  return {
    id: row.id,
    type: row.type as ElementType,
    name: row.name,
    description: row.description ?? '',
    section_id: row.section_id,
    position: { x: row.position_x ?? 0, y: row.position_y ?? 0 },
    size: { width: row.width ?? 300, height: row.height ?? 200 },
    tags: parseJSON<string[]>(row.tags, []),
    status: (row.status ?? 'current') as ElementStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
    data: parseJSON<ElementData>(row.data, {} as ElementData),
  };
}

function rowToConnection(row: any): Connection {
  return {
    id: row.id,
    from_element_id: row.from_element_id,
    to_element_id: row.to_element_id,
    label: row.label ?? '',
    style: (row.style ?? 'solid') as Connection['style'],
    color: row.color ?? '',
    arrow: (row.arrow ?? 'forward') as Connection['arrow'],
    status: (row.status ?? 'current') as Connection['status'],
    metadata: parseJSON<ConnectionMetadata>(row.metadata, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToCrossReference(row: any): CrossReference {
  return {
    id: row.id,
    from_element_id: row.from_element_id,
    to_element_id: row.to_element_id,
    relationship: row.relationship,
    description: row.description ?? '',
    bidirectional: !!row.bidirectional,
    created_at: row.created_at,
  };
}

function rowToBoardLink(row: any): BoardLink {
  return {
    id: row.id,
    target_board_id: row.target_board_id,
    label: row.label,
    description: row.description ?? '',
    element_id: row.element_id ?? null,
    created_at: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Project type (no separate model file yet)
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// BoardStore
// ---------------------------------------------------------------------------

export class BoardStore {

  // =========================================================================
  // Project CRUD
  // =========================================================================

  createProject(input: { name: string; path: string }): Project {
    const db = getDb();
    const id = generateProjectId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO projects (id, name, path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, input.name, input.path, timestamp, timestamp);

    return { id, name: input.name, path: input.path, created_at: timestamp, updated_at: timestamp };
  }

  listProjects(): Project[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      path: r.path,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  getProject(id: string): Project {
    const db = getDb();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!row) throw new Error(`Project not found: ${id}`);
    return { id: row.id, name: row.name, path: row.path, created_at: row.created_at, updated_at: row.updated_at };
  }

  deleteProject(id: string): void {
    const db = getDb();
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    if (result.changes === 0) throw new Error(`Project not found: ${id}`);
  }

  // =========================================================================
  // Board CRUD
  // =========================================================================

  async createBoard(input: {
    name: string;
    project_id: string;
    project_path: string;
    description?: string;
    theme?: 'light' | 'dark';
    tags?: string[];
  }): Promise<Board> {
    const db = getDb();
    const boardId = generateBoardId();
    const timestamp = now();
    const config = { ...DEFAULT_BOARD_CONFIG };
    const tags = input.tags || [];

    db.prepare(`
      INSERT INTO boards (id, project_id, name, description, theme, tags, version, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      boardId,
      input.project_id,
      input.name,
      input.description || '',
      input.theme || 'dark',
      JSON.stringify(tags),
      1,
      JSON.stringify(config),
      timestamp,
      timestamp,
    );

    return {
      id: boardId,
      name: input.name,
      description: input.description || '',
      project_path: input.project_path,
      theme: input.theme || 'dark',
      tags,
      created_at: timestamp,
      updated_at: timestamp,
      version: 1,
      sections: [],
      connections: [],
      cross_references: [],
      board_links: [],
      config,
    };
  }

  async getBoard(boardId: string): Promise<Board> {
    const db = getDb();

    const boardRow = db.prepare('SELECT b.*, p.path as project_path FROM boards b JOIN projects p ON b.project_id = p.id WHERE b.id = ?').get(boardId) as any;
    if (!boardRow) throw new Error(`Board not found: ${boardId}`);

    // Fetch all children in parallel-ish (synchronous but batched)
    const sectionRows = db.prepare('SELECT * FROM sections WHERE board_id = ? ORDER BY created_at').all(boardId) as any[];
    const elementRows = db.prepare('SELECT * FROM elements WHERE board_id = ? ORDER BY created_at').all(boardId) as any[];
    const connectionRows = db.prepare('SELECT * FROM connections WHERE board_id = ? ORDER BY created_at').all(boardId) as any[];
    const crossRefRows = db.prepare('SELECT * FROM cross_references WHERE board_id = ? ORDER BY created_at').all(boardId) as any[];
    const boardLinkRows = db.prepare('SELECT * FROM board_links WHERE board_id = ? ORDER BY created_at').all(boardId) as any[];

    // Build sections with their elements
    const sections = sectionRows.map(rowToSection);
    const elements = elementRows.map(rowToElement);

    // Group elements by section_id
    const elementsBySection = new Map<string, Element[]>();
    for (const el of elements) {
      const list = elementsBySection.get(el.section_id) || [];
      list.push(el);
      elementsBySection.set(el.section_id, list);
    }
    for (const sec of sections) {
      sec.elements = elementsBySection.get(sec.id) || [];
    }

    const resolvedSections = resolveSectionTree(sections);

    return {
      id: boardRow.id,
      name: boardRow.name,
      description: boardRow.description ?? '',
      project_path: boardRow.project_path ?? '',
      theme: (boardRow.theme ?? 'dark') as 'light' | 'dark',
      tags: parseJSON<string[]>(boardRow.tags, []),
      created_at: boardRow.created_at,
      updated_at: boardRow.updated_at,
      version: boardRow.version ?? 1,
      sections: resolvedSections,
      connections: connectionRows.map(rowToConnection),
      cross_references: crossRefRows.map(rowToCrossReference),
      board_links: boardLinkRows.map(rowToBoardLink),
      config: parseJSON<BoardConfig>(boardRow.config, { ...DEFAULT_BOARD_CONFIG }),
    };
  }

  async listBoards(projectPath?: string, projectId?: string): Promise<BoardIndexEntry[]> {
    const db = getDb();
    let rows: any[];

    const baseQuery = `
      SELECT b.id as board_id, b.name, p.path as project_path, b.description, b.updated_at as last_updated, b.version,
        (SELECT COUNT(*) FROM elements e WHERE e.board_id = b.id) as element_count
      FROM boards b
      JOIN projects p ON b.project_id = p.id
    `;
    if (projectId) {
      rows = db.prepare(baseQuery + ` WHERE b.project_id = ? ORDER BY b.updated_at DESC`).all(projectId) as any[];
    } else if (projectPath) {
      rows = db.prepare(baseQuery + ` WHERE p.path = ? ORDER BY b.updated_at DESC`).all(projectPath) as any[];
    } else {
      rows = db.prepare(baseQuery + ` ORDER BY b.updated_at DESC`).all() as any[];
    }

    return rows.map(r => ({
      board_id: r.board_id,
      name: r.name,
      project_path: r.project_path,
      description: r.description ?? '',
      last_updated: r.last_updated,
      version: r.version ?? 1,
      element_count: r.element_count ?? 0,
    }));
  }

  async deleteBoard(boardId: string): Promise<void> {
    const db = getDb();
    // CASCADE handles children
    db.prepare('DELETE FROM boards WHERE id = ?').run(boardId);
  }

  async saveBoard(board: Board): Promise<void> {
    const db = getDb();
    board.updated_at = now();

    db.prepare(`
      UPDATE boards SET name = ?, description = ?, theme = ?, tags = ?, version = ?, config = ?, updated_at = ?
      WHERE id = ?
    `).run(
      board.name,
      board.description,
      board.theme,
      JSON.stringify(board.tags),
      board.version,
      JSON.stringify(board.config),
      board.updated_at,
      board.id,
    );
  }

  // =========================================================================
  // Section operations
  // =========================================================================

  async addSection(boardId: string, input: {
    title: string;
    category: SectionCategory;
    description?: string;
    parent_section_id?: string;
    position?: Position;
    color?: string;
    collapsed?: boolean;
    tags?: string[];
  }): Promise<Section> {
    const db = getDb();
    // Validate board exists
    const boardRow = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
    if (!boardRow) throw new Error(`Board not found: ${boardId}`);

    const id = generateSectionId();
    const timestamp = now();
    const pos = input.position || { x: 0, y: 0 };
    const tags = input.tags || [];

    db.prepare(`
      INSERT INTO sections (id, board_id, title, description, category, parent_section_id, position_x, position_y, width, height, color, collapsed, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, boardId, input.title, input.description || '', input.category,
      input.parent_section_id || null,
      pos.x, pos.y, 600, 400,
      input.color || '', input.collapsed ? 1 : 0,
      JSON.stringify(tags), timestamp, timestamp,
    );

    // Touch board updated_at
    db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

    return {
      id,
      title: input.title,
      description: input.description || '',
      category: input.category,
      parent_section_id: input.parent_section_id || null,
      position: pos,
      size: { width: 600, height: 400 },
      color: input.color || '',
      collapsed: input.collapsed || false,
      tags,
      created_at: timestamp,
      updated_at: timestamp,
      elements: [],
      children_sections: [],
    };
  }

  async updateSection(boardId: string, sectionId: string, input: {
    title?: string;
    description?: string;
    position?: Position;
    color?: string;
    collapsed?: boolean;
    tags?: string[];
  }): Promise<Section> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM sections WHERE id = ? AND board_id = ?').get(sectionId, boardId) as any;
    if (!row) throw new Error(`Section not found: ${sectionId}`);

    const timestamp = now();
    const title = input.title !== undefined ? input.title : row.title;
    const description = input.description !== undefined ? input.description : row.description;
    const posX = input.position !== undefined ? input.position.x : row.position_x;
    const posY = input.position !== undefined ? input.position.y : row.position_y;
    const color = input.color !== undefined ? input.color : row.color;
    const collapsed = input.collapsed !== undefined ? (input.collapsed ? 1 : 0) : row.collapsed;
    const tags = input.tags !== undefined ? input.tags : parseJSON<string[]>(row.tags, []);

    db.prepare(`
      UPDATE sections SET title = ?, description = ?, position_x = ?, position_y = ?, color = ?, collapsed = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `).run(title, description, posX, posY, color, collapsed, JSON.stringify(tags), timestamp, sectionId);

    db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

    // Fetch elements for the section
    const elementRows = db.prepare('SELECT * FROM elements WHERE section_id = ? ORDER BY created_at').all(sectionId) as any[];

    return {
      id: sectionId,
      title,
      description: description ?? '',
      category: row.category as SectionCategory,
      parent_section_id: row.parent_section_id ?? null,
      position: { x: posX, y: posY },
      size: { width: row.width ?? 600, height: row.height ?? 400 },
      color: color ?? '',
      collapsed: !!collapsed,
      tags,
      created_at: row.created_at,
      updated_at: timestamp,
      elements: elementRows.map(rowToElement),
      children_sections: [],
    };
  }

  async removeSection(boardId: string, sectionId: string, removeChildren: boolean): Promise<number> {
    const db = getDb();
    const row = db.prepare('SELECT id FROM sections WHERE id = ? AND board_id = ?').get(sectionId, boardId) as any;
    if (!row) throw new Error(`Section not found: ${sectionId}`);

    const txn = db.transaction(() => {
      let removedElements = 0;

      const collectSections = (sid: string): string[] => {
        const children = db.prepare('SELECT id FROM sections WHERE parent_section_id = ? AND board_id = ?').all(sid, boardId) as any[];
        let ids = [sid];
        for (const child of children) {
          ids = ids.concat(collectSections(child.id));
        }
        return ids;
      };

      const sectionIds = collectSections(sectionId);

      if (removeChildren) {
        // Count elements that will be removed
        for (const sid of sectionIds) {
          const count = (db.prepare('SELECT COUNT(*) as cnt FROM elements WHERE section_id = ?').get(sid) as any).cnt;
          removedElements += count;
        }
        // Connections/cross_references/board_links referencing these elements are cascade-deleted
        // by the FK ON DELETE CASCADE on elements table
      }

      // Delete sections (CASCADE will remove elements, which CASCADE removes connections)
      for (const sid of sectionIds) {
        db.prepare('DELETE FROM sections WHERE id = ?').run(sid);
      }

      db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(now(), boardId);
      return removedElements;
    });

    return txn();
  }

  // =========================================================================
  // Element operations
  // =========================================================================

  async addElement(boardId: string, sectionId: string, input: {
    type: ElementType;
    name: string;
    description?: string;
    position?: Position;
    size?: Size;
    tags?: string[];
    data: ElementData;
  }): Promise<Element> {
    const db = getDb();
    // Validate section
    const secRow = db.prepare('SELECT id FROM sections WHERE id = ? AND board_id = ?').get(sectionId, boardId);
    if (!secRow) throw new Error(`Section not found: ${sectionId}`);

    const id = generateElementId();
    const timestamp = now();
    const pos = input.position || { x: 0, y: 0 };
    const size = input.size || { width: 300, height: 200 };
    const tags = input.tags || [];

    db.prepare(`
      INSERT INTO elements (id, board_id, section_id, type, name, description, position_x, position_y, width, height, tags, status, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, boardId, sectionId, input.type, input.name, input.description || '',
      pos.x, pos.y, size.width, size.height,
      JSON.stringify(tags), 'current', JSON.stringify(input.data),
      timestamp, timestamp,
    );

    db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

    return {
      id,
      type: input.type,
      name: input.name,
      description: input.description || '',
      section_id: sectionId,
      position: pos,
      size,
      tags,
      status: 'current',
      created_at: timestamp,
      updated_at: timestamp,
      data: input.data,
    };
  }

  async updateElement(boardId: string, elementId: string, input: {
    name?: string;
    description?: string;
    position?: Position;
    size?: Size;
    tags?: string[];
    data?: Record<string, unknown>;
  }): Promise<{ element: Element; previousVersion: number }> {
    const db = getDb();

    const txn = db.transaction(() => {
      const elRow = db.prepare('SELECT e.*, b.version FROM elements e JOIN boards b ON e.board_id = b.id WHERE e.id = ? AND e.board_id = ?').get(elementId, boardId) as any;
      if (!elRow) throw new Error(`Element not found: ${elementId}`);

      const previousVersion = elRow.version ?? 1;
      const timestamp = now();
      const name = input.name !== undefined ? input.name : elRow.name;
      const description = input.description !== undefined ? input.description : elRow.description;
      const posX = input.position !== undefined ? input.position.x : elRow.position_x;
      const posY = input.position !== undefined ? input.position.y : elRow.position_y;
      const width = input.size !== undefined ? input.size.width : elRow.width;
      const height = input.size !== undefined ? input.size.height : elRow.height;
      const tags = input.tags !== undefined ? input.tags : parseJSON<string[]>(elRow.tags, []);

      let data: ElementData;
      if (input.data !== undefined) {
        const existing = parseJSON<Record<string, unknown>>(elRow.data, {});
        data = { ...existing, ...input.data } as ElementData;
      } else {
        data = parseJSON<ElementData>(elRow.data, {} as ElementData);
      }

      db.prepare(`
        UPDATE elements SET name = ?, description = ?, position_x = ?, position_y = ?, width = ?, height = ?, tags = ?, data = ?, updated_at = ?
        WHERE id = ?
      `).run(name, description, posX, posY, width, height, JSON.stringify(tags), JSON.stringify(data), timestamp, elementId);

      db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

      const element: Element = {
        id: elementId,
        type: elRow.type as ElementType,
        name,
        description: description ?? '',
        section_id: elRow.section_id,
        position: { x: posX, y: posY },
        size: { width, height },
        tags,
        status: (elRow.status ?? 'current') as ElementStatus,
        created_at: elRow.created_at,
        updated_at: timestamp,
        data,
      };

      return { element, previousVersion };
    });

    return txn();
  }

  async removeElement(boardId: string, elementId: string): Promise<number> {
    const db = getDb();

    const txn = db.transaction(() => {
      const elRow = db.prepare('SELECT id, section_id FROM elements WHERE id = ? AND board_id = ?').get(elementId, boardId) as any;
      if (!elRow) throw new Error(`Element not found: ${elementId}`);

      // Count connections that will be removed
      const connCount = (db.prepare(
        'SELECT COUNT(*) as cnt FROM connections WHERE board_id = ? AND (from_element_id = ? OR to_element_id = ?)'
      ).get(boardId, elementId, elementId) as any).cnt;

      // Remove cross_references and board_links referencing this element
      db.prepare('DELETE FROM cross_references WHERE board_id = ? AND (from_element_id = ? OR to_element_id = ?)').run(boardId, elementId, elementId);
      db.prepare('DELETE FROM board_links WHERE board_id = ? AND element_id = ?').run(boardId, elementId);

      // Delete element (CASCADE removes connections)
      db.prepare('DELETE FROM elements WHERE id = ?').run(elementId);

      db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(now(), boardId);
      return connCount;
    });

    return txn();
  }

  async getElement(boardId: string, elementId: string): Promise<Element> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM elements WHERE id = ? AND board_id = ?').get(elementId, boardId) as any;
    if (!row) throw new Error(`Element not found: ${elementId}`);
    return rowToElement(row);
  }

  async bulkAddElements(boardId: string, sectionId: string, inputs: Array<{
    type: ElementType;
    name: string;
    description?: string;
    tags?: string[];
    data: ElementData;
  }>): Promise<Element[]> {
    const db = getDb();

    const txn = db.transaction(() => {
      const secRow = db.prepare('SELECT id FROM sections WHERE id = ? AND board_id = ?').get(sectionId, boardId);
      if (!secRow) throw new Error(`Section not found: ${sectionId}`);

      const timestamp = now();
      const stmt = db.prepare(`
        INSERT INTO elements (id, board_id, section_id, type, name, description, position_x, position_y, width, height, tags, status, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const elements: Element[] = inputs.map(input => {
        const id = generateElementId();
        const tags = input.tags || [];
        stmt.run(
          id, boardId, sectionId, input.type, input.name, input.description || '',
          0, 0, 300, 200,
          JSON.stringify(tags), 'current', JSON.stringify(input.data),
          timestamp, timestamp,
        );
        return {
          id,
          type: input.type,
          name: input.name,
          description: input.description || '',
          section_id: sectionId,
          position: { x: 0, y: 0 },
          size: { width: 300, height: 200 },
          tags,
          status: 'current' as ElementStatus,
          created_at: timestamp,
          updated_at: timestamp,
          data: input.data,
        };
      });

      db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);
      return elements;
    });

    return txn();
  }

  async bulkUpdateElements(boardId: string, updates: Array<{
    element_id: string;
    name?: string;
    description?: string;
    tags?: string[];
    data?: Record<string, unknown>;
  }>): Promise<number> {
    const db = getDb();

    const txn = db.transaction(() => {
      const timestamp = now();
      let count = 0;

      for (const update of updates) {
        const elRow = db.prepare('SELECT * FROM elements WHERE id = ? AND board_id = ?').get(update.element_id, boardId) as any;
        if (!elRow) continue;

        const name = update.name !== undefined ? update.name : elRow.name;
        const description = update.description !== undefined ? update.description : elRow.description;
        const tags = update.tags !== undefined ? update.tags : parseJSON<string[]>(elRow.tags, []);

        let data: ElementData;
        if (update.data !== undefined) {
          const existing = parseJSON<Record<string, unknown>>(elRow.data, {});
          data = { ...existing, ...update.data } as ElementData;
        } else {
          data = parseJSON<ElementData>(elRow.data, {} as ElementData);
        }

        db.prepare(`
          UPDATE elements SET name = ?, description = ?, tags = ?, data = ?, updated_at = ?
          WHERE id = ?
        `).run(name, description, JSON.stringify(tags), JSON.stringify(data), timestamp, update.element_id);

        count++;
      }

      db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);
      return count;
    });

    return txn();
  }

  // =========================================================================
  // Connection operations
  // =========================================================================

  async addConnection(boardId: string, input: {
    from_element_id: string;
    to_element_id: string;
    label?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
    arrow?: 'forward' | 'backward' | 'both' | 'none';
    metadata?: ConnectionMetadata;
  }): Promise<Connection> {
    const db = getDb();

    // Validate element IDs exist in this board
    const fromEl = db.prepare('SELECT id FROM elements WHERE id = ? AND board_id = ?').get(input.from_element_id, boardId);
    if (!fromEl) throw new Error(`Element not found: ${input.from_element_id}`);
    const toEl = db.prepare('SELECT id FROM elements WHERE id = ? AND board_id = ?').get(input.to_element_id, boardId);
    if (!toEl) throw new Error(`Element not found: ${input.to_element_id}`);

    const id = generateConnectionId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO connections (id, board_id, from_element_id, to_element_id, label, style, color, arrow, status, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, boardId,
      input.from_element_id, input.to_element_id,
      input.label || '', input.style || 'solid', input.color || '',
      input.arrow || 'forward', 'current',
      JSON.stringify(input.metadata || {}),
      timestamp, timestamp,
    );

    db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

    return {
      id,
      from_element_id: input.from_element_id,
      to_element_id: input.to_element_id,
      label: input.label || '',
      style: input.style || 'solid',
      color: input.color || '',
      arrow: input.arrow || 'forward',
      status: 'current',
      metadata: input.metadata || {},
      created_at: timestamp,
      updated_at: timestamp,
    };
  }

  async updateConnection(boardId: string, connectionId: string, input: {
    label?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
    metadata?: Record<string, string>;
  }): Promise<Connection> {
    const db = getDb();

    const txn = db.transaction(() => {
      const row = db.prepare('SELECT * FROM connections WHERE id = ? AND board_id = ?').get(connectionId, boardId) as any;
      if (!row) throw new Error(`Connection not found: ${connectionId}`);

      const timestamp = now();
      const label = input.label !== undefined ? input.label : row.label;
      const style = input.style !== undefined ? input.style : row.style;
      const color = input.color !== undefined ? input.color : row.color;
      const metadata = input.metadata !== undefined
        ? { ...parseJSON<ConnectionMetadata>(row.metadata, {}), ...input.metadata }
        : parseJSON<ConnectionMetadata>(row.metadata, {});

      db.prepare(`
        UPDATE connections SET label = ?, style = ?, color = ?, metadata = ?, updated_at = ?
        WHERE id = ?
      `).run(label, style, color, JSON.stringify(metadata), timestamp, connectionId);

      db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

      return {
        id: connectionId,
        from_element_id: row.from_element_id,
        to_element_id: row.to_element_id,
        label: label ?? '',
        style: (style ?? 'solid') as Connection['style'],
        color: color ?? '',
        arrow: (row.arrow ?? 'forward') as Connection['arrow'],
        status: (row.status ?? 'current') as Connection['status'],
        metadata,
        created_at: row.created_at,
        updated_at: timestamp,
      };
    });

    return txn();
  }

  async removeConnection(boardId: string, connectionId: string): Promise<void> {
    const db = getDb();
    const row = db.prepare('SELECT id FROM connections WHERE id = ? AND board_id = ?').get(connectionId, boardId);
    if (!row) throw new Error(`Connection not found: ${connectionId}`);

    db.prepare('DELETE FROM connections WHERE id = ?').run(connectionId);
    db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(now(), boardId);
  }

  // =========================================================================
  // Cross-reference operations
  // =========================================================================

  async addCrossReference(boardId: string, input: {
    from_element_id: string;
    to_element_id: string;
    relationship: string;
    description?: string;
    bidirectional?: boolean;
  }): Promise<CrossReference> {
    const db = getDb();

    // Validate elements exist in this board
    const fromEl = db.prepare('SELECT id FROM elements WHERE id = ? AND board_id = ?').get(input.from_element_id, boardId);
    if (!fromEl) throw new Error(`Element not found: ${input.from_element_id}`);
    const toEl = db.prepare('SELECT id FROM elements WHERE id = ? AND board_id = ?').get(input.to_element_id, boardId);
    if (!toEl) throw new Error(`Element not found: ${input.to_element_id}`);

    const id = generateCrossRefId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO cross_references (id, board_id, from_element_id, to_element_id, relationship, description, bidirectional, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, boardId,
      input.from_element_id, input.to_element_id,
      input.relationship, input.description || '',
      input.bidirectional ? 1 : 0,
      timestamp,
    );

    db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

    return {
      id,
      from_element_id: input.from_element_id,
      to_element_id: input.to_element_id,
      relationship: input.relationship,
      description: input.description || '',
      bidirectional: input.bidirectional || false,
      created_at: timestamp,
    };
  }

  // =========================================================================
  // Board link operations
  // =========================================================================

  async addBoardLink(boardId: string, input: {
    target_board_id: string;
    label: string;
    description?: string;
    element_id?: string;
  }): Promise<BoardLink> {
    const db = getDb();

    if (input.element_id) {
      const elRow = db.prepare('SELECT id FROM elements WHERE id = ? AND board_id = ?').get(input.element_id, boardId);
      if (!elRow) throw new Error(`Element not found: ${input.element_id}`);
    }

    const id = generateBoardLinkId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO board_links (id, board_id, target_board_id, label, description, element_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, boardId,
      input.target_board_id, input.label,
      input.description || '', input.element_id || null,
      timestamp,
    );

    db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

    return {
      id,
      target_board_id: input.target_board_id,
      label: input.label,
      description: input.description || '',
      element_id: input.element_id || null,
      created_at: timestamp,
    };
  }

  // =========================================================================
  // Tag operations
  // =========================================================================

  async addTags(boardId: string, elementId: string, tags: string[]): Promise<string[]> {
    const db = getDb();

    const txn = db.transaction(() => {
      const row = db.prepare('SELECT * FROM elements WHERE id = ? AND board_id = ?').get(elementId, boardId) as any;
      if (!row) throw new Error(`Element not found: ${elementId}`);

      const existing = parseJSON<string[]>(row.tags, []);
      const tagSet = new Set([...existing, ...tags.map(t => t.toLowerCase())]);
      const merged = [...tagSet];
      const timestamp = now();

      db.prepare('UPDATE elements SET tags = ?, updated_at = ? WHERE id = ?').run(
        JSON.stringify(merged), timestamp, elementId,
      );
      db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

      return merged;
    });

    return txn();
  }

  async removeTags(boardId: string, elementId: string, tags: string[]): Promise<string[]> {
    const db = getDb();

    const txn = db.transaction(() => {
      const row = db.prepare('SELECT * FROM elements WHERE id = ? AND board_id = ?').get(elementId, boardId) as any;
      if (!row) throw new Error(`Element not found: ${elementId}`);

      const existing = parseJSON<string[]>(row.tags, []);
      const removeSet = new Set(tags.map(t => t.toLowerCase()));
      const filtered = existing.filter(t => !removeSet.has(t));
      const timestamp = now();

      db.prepare('UPDATE elements SET tags = ?, updated_at = ? WHERE id = ?').run(
        JSON.stringify(filtered), timestamp, elementId,
      );
      db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(timestamp, boardId);

      return filtered;
    });

    return txn();
  }

  // =========================================================================
  // Helpers (public — used by MCP tools)
  // =========================================================================

  findElement(board: Board, elementId: string): { section: Section; element: Element } {
    for (const section of board.sections) {
      const element = section.elements.find(e => e.id === elementId);
      if (element) return { section, element };
    }
    throw new Error(`Element not found: ${elementId}`);
  }
}
