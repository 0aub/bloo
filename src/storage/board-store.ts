import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, renameSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type {
  Board, Section, Element, BoardConfig, BoardIndex, BoardIndexEntry,
  SectionCategory, LayoutType, ElementType, ElementStatus, Position, Size,
} from '../models/board.js';
import { DEFAULT_BOARD_CONFIG } from '../models/board.js';
import type { Connection, ConnectionMetadata, CrossReference, BoardLink } from '../models/connections.js';
import type { ElementData } from '../models/elements.js';
import {
  getBoardDir, getBoardFilePath, getBoardIndexPath,
  getStorageRoot, getChangelogPath, getSnapshotsDir, getMilestonesDir, getDecisionsDir,
} from './paths.js';
import {
  generateBoardId, generateSectionId, generateElementId,
  generateConnectionId, generateCrossRefId, generateBoardLinkId,
} from '../utils/id-generator.js';

function now(): string {
  return new Date().toISOString();
}

function atomicWrite(filePath: string, data: string): void {
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, data, 'utf-8');
  renameSync(tmpPath, filePath);
}

function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

function readJSON<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath: string, data: unknown): void {
  atomicWrite(filePath, JSON.stringify(data, null, 2));
}

// Strip transient fields before persisting
function stripForStorage(board: Board): Board {
  return {
    ...board,
    sections: board.sections.map(s => ({
      ...s,
      children_sections: [], // Never persisted
    })),
  };
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

export class BoardStore {
  // --- Board CRUD ---

  async createBoard(input: {
    name: string;
    project_path: string;
    description?: string;
    theme?: 'light' | 'dark';
    tags?: string[];
  }): Promise<Board> {
    const boardId = generateBoardId();
    const boardDir = getBoardDir(boardId);

    // Create directory tree
    ensureDir(boardDir);
    ensureDir(path.join(boardDir, 'history', 'snapshots'));
    ensureDir(path.join(boardDir, 'milestones'));
    ensureDir(path.join(boardDir, 'decisions'));

    // Initialize changelog
    writeFileSync(getChangelogPath(boardId), '', 'utf-8');

    const timestamp = now();
    const board: Board = {
      id: boardId,
      name: input.name,
      description: input.description || '',
      project_path: input.project_path,
      theme: input.theme || 'dark',
      tags: input.tags || [],
      created_at: timestamp,
      updated_at: timestamp,
      version: 1,
      sections: [],
      connections: [],
      cross_references: [],
      board_links: [],
      config: { ...DEFAULT_BOARD_CONFIG },
    };

    writeJSON(getBoardFilePath(boardId), stripForStorage(board));
    await this.updateIndex(board);

    return board;
  }

  async getBoard(boardId: string): Promise<Board> {
    const filePath = getBoardFilePath(boardId);
    if (!existsSync(filePath)) {
      throw new Error(`Board not found: ${boardId}`);
    }
    const board = readJSON<Board>(filePath);
    board.sections = resolveSectionTree(board.sections);
    return board;
  }

  async listBoards(projectPath?: string): Promise<BoardIndexEntry[]> {
    const indexPath = getBoardIndexPath();
    if (!existsSync(indexPath)) return [];
    const index = readJSON<BoardIndex>(indexPath);
    if (projectPath) {
      return index.boards.filter(b => b.project_path === projectPath);
    }
    return index.boards;
  }

  async deleteBoard(boardId: string): Promise<void> {
    const boardDir = getBoardDir(boardId);
    if (existsSync(boardDir)) {
      rmSync(boardDir, { recursive: true, force: true });
    }
    await this.removeFromIndex(boardId);
  }

  async saveBoard(board: Board): Promise<void> {
    board.updated_at = now();
    writeJSON(getBoardFilePath(board.id), stripForStorage(board));
    await this.updateIndex(board);
  }

  // --- Section operations ---

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
    const board = await this.getBoard(boardId);
    const timestamp = now();
    const section: Section = {
      id: generateSectionId(),
      title: input.title,
      description: input.description || '',
      category: input.category,
      parent_section_id: input.parent_section_id || null,
      position: input.position || { x: 0, y: 0 },
      size: { width: 600, height: 400 },
      color: input.color || '',
      collapsed: input.collapsed || false,
      tags: input.tags || [],
      created_at: timestamp,
      updated_at: timestamp,
      elements: [],
      children_sections: [],
    };

    board.sections.push(section);
    await this.saveBoard(board);
    return section;
  }

  async updateSection(boardId: string, sectionId: string, input: {
    title?: string;
    description?: string;
    position?: Position;
    color?: string;
    collapsed?: boolean;
    tags?: string[];
  }): Promise<Section> {
    const board = await this.getBoard(boardId);
    const section = board.sections.find(s => s.id === sectionId);
    if (!section) throw new Error(`Section not found: ${sectionId}`);

    if (input.title !== undefined) section.title = input.title;
    if (input.description !== undefined) section.description = input.description;
    if (input.position !== undefined) section.position = input.position;
    if (input.color !== undefined) section.color = input.color;
    if (input.collapsed !== undefined) section.collapsed = input.collapsed;
    if (input.tags !== undefined) section.tags = input.tags;
    section.updated_at = now();

    await this.saveBoard(board);
    return section;
  }

  async removeSection(boardId: string, sectionId: string, removeChildren: boolean): Promise<number> {
    const board = await this.getBoard(boardId);
    const sectionIndex = board.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) throw new Error(`Section not found: ${sectionId}`);

    let removedElements = 0;
    const section = board.sections[sectionIndex];

    if (removeChildren) {
      // Remove all elements in this section and their connections
      for (const element of section.elements) {
        this.cascadeRemoveElement(board, element.id);
        removedElements++;
      }
    }

    // Remove child sections recursively
    const childSections = board.sections.filter(s => s.parent_section_id === sectionId);
    for (const child of childSections) {
      removedElements += await this.removeSectionInPlace(board, child.id, removeChildren);
    }

    board.sections.splice(sectionIndex, 1);
    await this.saveBoard(board);
    return removedElements;
  }

  private async removeSectionInPlace(board: Board, sectionId: string, removeChildren: boolean): Promise<number> {
    const sectionIndex = board.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return 0;
    let removedElements = 0;
    const section = board.sections[sectionIndex];

    if (removeChildren) {
      for (const element of section.elements) {
        this.cascadeRemoveElement(board, element.id);
        removedElements++;
      }
    }

    const childSections = board.sections.filter(s => s.parent_section_id === sectionId);
    for (const child of childSections) {
      removedElements += await this.removeSectionInPlace(board, child.id, removeChildren);
    }

    board.sections.splice(sectionIndex, 1);
    return removedElements;
  }

  // --- Element operations ---

  async addElement(boardId: string, sectionId: string, input: {
    type: ElementType;
    name: string;
    description?: string;
    position?: Position;
    size?: Size;
    tags?: string[];
    data: ElementData;
  }): Promise<Element> {
    const board = await this.getBoard(boardId);
    const section = board.sections.find(s => s.id === sectionId);
    if (!section) throw new Error(`Section not found: ${sectionId}`);

    const timestamp = now();
    const element: Element = {
      id: generateElementId(),
      type: input.type,
      name: input.name,
      description: input.description || '',
      section_id: sectionId,
      position: input.position || { x: 0, y: 0 },
      size: input.size || { width: 300, height: 200 },
      tags: input.tags || [],
      status: 'current',
      created_at: timestamp,
      updated_at: timestamp,
      data: input.data,
    };

    section.elements.push(element);
    await this.saveBoard(board);
    return element;
  }

  async updateElement(boardId: string, elementId: string, input: {
    name?: string;
    description?: string;
    position?: Position;
    size?: Size;
    tags?: string[];
    data?: Record<string, unknown>;
  }): Promise<{ element: Element; previousVersion: number }> {
    const board = await this.getBoard(boardId);
    const { section, element } = this.findElement(board, elementId);
    const previousVersion = board.version;

    if (input.name !== undefined) element.name = input.name;
    if (input.description !== undefined) element.description = input.description;
    if (input.position !== undefined) element.position = input.position;
    if (input.size !== undefined) element.size = input.size;
    if (input.tags !== undefined) element.tags = input.tags;
    if (input.data !== undefined) {
      // Deep merge: top-level keys in data are merged, arrays are replaced
      element.data = { ...element.data, ...input.data } as ElementData;
    }
    element.updated_at = now();

    await this.saveBoard(board);
    return { element, previousVersion };
  }

  async removeElement(boardId: string, elementId: string): Promise<number> {
    const board = await this.getBoard(boardId);
    const { section } = this.findElement(board, elementId);
    const removedConnections = this.cascadeRemoveElement(board, elementId);
    section.elements = section.elements.filter(e => e.id !== elementId);
    await this.saveBoard(board);
    return removedConnections;
  }

  async getElement(boardId: string, elementId: string): Promise<Element> {
    const board = await this.getBoard(boardId);
    const { element } = this.findElement(board, elementId);
    return element;
  }

  async bulkAddElements(boardId: string, sectionId: string, inputs: Array<{
    type: ElementType;
    name: string;
    description?: string;
    tags?: string[];
    data: ElementData;
  }>): Promise<Element[]> {
    const board = await this.getBoard(boardId);
    const section = board.sections.find(s => s.id === sectionId);
    if (!section) throw new Error(`Section not found: ${sectionId}`);

    const timestamp = now();
    const elements: Element[] = inputs.map(input => ({
      id: generateElementId(),
      type: input.type,
      name: input.name,
      description: input.description || '',
      section_id: sectionId,
      position: { x: 0, y: 0 },
      size: { width: 300, height: 200 },
      tags: input.tags || [],
      status: 'current' as ElementStatus,
      created_at: timestamp,
      updated_at: timestamp,
      data: input.data,
    }));

    section.elements.push(...elements);
    await this.saveBoard(board);
    return elements;
  }

  async bulkUpdateElements(boardId: string, updates: Array<{
    element_id: string;
    name?: string;
    description?: string;
    tags?: string[];
    data?: Record<string, unknown>;
  }>): Promise<number> {
    const board = await this.getBoard(boardId);
    let count = 0;

    for (const update of updates) {
      try {
        const { element } = this.findElement(board, update.element_id);
        if (update.name !== undefined) element.name = update.name;
        if (update.description !== undefined) element.description = update.description;
        if (update.tags !== undefined) element.tags = update.tags;
        if (update.data !== undefined) {
          element.data = { ...element.data, ...update.data } as ElementData;
        }
        element.updated_at = now();
        count++;
      } catch {
        // Skip elements that don't exist
      }
    }

    await this.saveBoard(board);
    return count;
  }

  // --- Connection operations ---

  async addConnection(boardId: string, input: {
    from_element_id: string;
    to_element_id: string;
    label?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
    arrow?: 'forward' | 'backward' | 'both' | 'none';
    metadata?: ConnectionMetadata;
  }): Promise<Connection> {
    const board = await this.getBoard(boardId);

    // Validate element IDs exist
    this.findElement(board, input.from_element_id);
    this.findElement(board, input.to_element_id);

    const timestamp = now();
    const connection: Connection = {
      id: generateConnectionId(),
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

    board.connections.push(connection);
    await this.saveBoard(board);
    return connection;
  }

  async updateConnection(boardId: string, connectionId: string, input: {
    label?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
    metadata?: Record<string, string>;
  }): Promise<Connection> {
    const board = await this.getBoard(boardId);
    const conn = board.connections.find(c => c.id === connectionId);
    if (!conn) throw new Error(`Connection not found: ${connectionId}`);

    if (input.label !== undefined) conn.label = input.label;
    if (input.style !== undefined) conn.style = input.style;
    if (input.color !== undefined) conn.color = input.color;
    if (input.metadata !== undefined) conn.metadata = { ...conn.metadata, ...input.metadata };
    conn.updated_at = now();

    await this.saveBoard(board);
    return conn;
  }

  async removeConnection(boardId: string, connectionId: string): Promise<void> {
    const board = await this.getBoard(boardId);
    const index = board.connections.findIndex(c => c.id === connectionId);
    if (index === -1) throw new Error(`Connection not found: ${connectionId}`);
    board.connections.splice(index, 1);
    await this.saveBoard(board);
  }

  // --- Cross-reference operations ---

  async addCrossReference(boardId: string, input: {
    from_element_id: string;
    to_element_id: string;
    relationship: string;
    description?: string;
    bidirectional?: boolean;
  }): Promise<CrossReference> {
    const board = await this.getBoard(boardId);

    this.findElement(board, input.from_element_id);
    this.findElement(board, input.to_element_id);

    const ref: CrossReference = {
      id: generateCrossRefId(),
      from_element_id: input.from_element_id,
      to_element_id: input.to_element_id,
      relationship: input.relationship,
      description: input.description || '',
      bidirectional: input.bidirectional || false,
      created_at: now(),
    };

    board.cross_references.push(ref);
    await this.saveBoard(board);
    return ref;
  }

  // --- Board link operations ---

  async addBoardLink(boardId: string, input: {
    target_board_id: string;
    label: string;
    description?: string;
    element_id?: string;
  }): Promise<BoardLink> {
    const board = await this.getBoard(boardId);

    if (input.element_id) {
      this.findElement(board, input.element_id);
    }

    const link: BoardLink = {
      id: generateBoardLinkId(),
      target_board_id: input.target_board_id,
      label: input.label,
      description: input.description || '',
      element_id: input.element_id || null,
      created_at: now(),
    };

    board.board_links.push(link);
    await this.saveBoard(board);
    return link;
  }

  // --- Tag operations ---

  async addTags(boardId: string, elementId: string, tags: string[]): Promise<string[]> {
    const board = await this.getBoard(boardId);
    const { element } = this.findElement(board, elementId);
    const tagSet = new Set([...element.tags, ...tags.map(t => t.toLowerCase())]);
    element.tags = [...tagSet];
    element.updated_at = now();
    await this.saveBoard(board);
    return element.tags;
  }

  async removeTags(boardId: string, elementId: string, tags: string[]): Promise<string[]> {
    const board = await this.getBoard(boardId);
    const { element } = this.findElement(board, elementId);
    const removeSet = new Set(tags.map(t => t.toLowerCase()));
    element.tags = element.tags.filter(t => !removeSet.has(t));
    element.updated_at = now();
    await this.saveBoard(board);
    return element.tags;
  }

  // --- Helpers ---

  findElement(board: Board, elementId: string): { section: Section; element: Element } {
    for (const section of board.sections) {
      const element = section.elements.find(e => e.id === elementId);
      if (element) return { section, element };
    }
    throw new Error(`Element not found: ${elementId}`);
  }

  private cascadeRemoveElement(board: Board, elementId: string): number {
    const beforeCount = board.connections.length;
    board.connections = board.connections.filter(
      c => c.from_element_id !== elementId && c.to_element_id !== elementId
    );
    board.cross_references = board.cross_references.filter(
      r => r.from_element_id !== elementId && r.to_element_id !== elementId
    );
    board.board_links = board.board_links.filter(
      l => l.element_id !== elementId
    );
    return beforeCount - board.connections.length;
  }

  // --- Index management ---

  private async updateIndex(board: Board): Promise<void> {
    const indexPath = getBoardIndexPath();
    ensureDir(path.dirname(indexPath));
    let index: BoardIndex = { boards: [] };

    if (existsSync(indexPath)) {
      try { index = readJSON<BoardIndex>(indexPath); } catch { /* corrupted index, recreate */ }
    }

    const elementCount = board.sections.reduce((sum, s) => sum + s.elements.length, 0);
    const entry: BoardIndexEntry = {
      board_id: board.id,
      name: board.name,
      project_path: board.project_path,
      description: board.description,
      last_updated: board.updated_at,
      version: board.version,
      element_count: elementCount,
    };

    const existing = index.boards.findIndex(b => b.board_id === board.id);
    if (existing >= 0) {
      index.boards[existing] = entry;
    } else {
      index.boards.push(entry);
    }

    writeJSON(indexPath, index);
  }

  private async removeFromIndex(boardId: string): Promise<void> {
    const indexPath = getBoardIndexPath();
    if (!existsSync(indexPath)) return;
    const index = readJSON<BoardIndex>(indexPath);
    index.boards = index.boards.filter(b => b.board_id !== boardId);
    writeJSON(indexPath, index);
  }
}
