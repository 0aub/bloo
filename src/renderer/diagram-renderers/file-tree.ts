import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { FileTreeData, FileEntry } from '../../models/elements.js';
import { roundedRect, rect, text, line, group, escapeHtml } from './svg-builder.js';

const FONT_FAMILY = "'Almarai', 'Inter', sans-serif";
const MONO_FONT = "'JetBrains Mono', monospace";
const PADDING = 16;
const ROW_HEIGHT = 24;
const INDENT_WIDTH = 16;
const ICON_WIDTH = 20;
const MIN_WIDTH = 320;
const CORNER_RADIUS = 8;

interface TreeNode {
  name: string;
  entry?: FileEntry;
  children: TreeNode[];
  depth: number;
  isDir: boolean;
}

function buildTree(entries: FileEntry[]): TreeNode[] {
  const root: TreeNode = { name: '', children: [], depth: -1, isDir: true };

  // Sort: directories first, then alphabetical
  const sorted = [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const entry of sorted) {
    const parts = entry.path.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let child = current.children.find(c => c.name === part);

      if (!child) {
        child = {
          name: part,
          entry: isLast ? entry : undefined,
          children: [],
          depth: i,
          isDir: isLast ? entry.type === 'directory' : true,
        };
        current.children.push(child);
      }

      if (isLast && !child.entry) {
        child.entry = entry;
        child.isDir = entry.type === 'directory';
      }

      current = child;
    }
  }

  return root.children;
}

function flattenTree(nodes: TreeNode[], depth: number = 0): Array<{ node: TreeNode; depth: number }> {
  const result: Array<{ node: TreeNode; depth: number }> = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

// Convert nested tree object format (sent by Claude) to flat FileEntry[] array
function treeObjectToEntries(tree: Record<string, any>, prefix: string = ''): FileEntry[] {
  const entries: FileEntry[] = [];
  for (const [key, value] of Object.entries(tree)) {
    if (key === '_description') continue;
    const path = prefix ? `${prefix}/${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Directory
      entries.push({
        path,
        type: 'directory',
        description: value._description || undefined,
      });
      entries.push(...treeObjectToEntries(value, path));
    } else {
      // File — value is a string description
      entries.push({
        path,
        type: 'file',
        description: typeof value === 'string' ? value : undefined,
      });
    }
  }
  return entries;
}

function resolveEntries(data: any): FileEntry[] {
  if (Array.isArray(data.entries) && data.entries.length > 0) return data.entries;
  if (data.tree && typeof data.tree === 'object') return treeObjectToEntries(data.tree);
  return [];
}

export function render(element: Element): string {
  const data = element.data as FileTreeData;

  const bg = 'hsl(160 10% 10%)';
  const border = 'hsl(160 8% 18%)';
  const fg = 'hsl(0 0% 95%)';
  const muted = 'hsl(155 5% 55%)';
  const accent = 'hsl(152 65% 55%)';
  const highlightBg = 'hsl(152 40% 15% / 0.3)';

  const resolvedEntries = resolveEntries(data);
  const treeNodes = buildTree(resolvedEntries);
  const flat = flattenTree(treeNodes);
  const size = calculateSize(element);

  const parts: string[] = [];

  // Outer container
  parts.push(roundedRect(0, 0, size.width, size.height, CORNER_RADIUS, {
    fill: bg,
    stroke: border,
    'stroke-width': 1,
  }));

  // Root label header
  parts.push(roundedRect(0, 0, size.width, 36, CORNER_RADIUS, {
    fill: 'hsl(160 8% 13%)',
    stroke: border,
    'stroke-width': 1,
  }));
  // Fix bottom corners of header (cover the rounded bottom corners)
  parts.push(rect(0, 20, size.width, 16, {
    fill: 'hsl(160 8% 13%)',
  }));
  parts.push(text(PADDING, 23, data.root || element.name, {
    fill: accent,
    'font-size': 14,
    'font-weight': 'bold',
    'font-family': MONO_FONT,
  }));

  const startY = 44;

  flat.forEach((item, idx) => {
    const y = startY + idx * ROW_HEIGHT;
    const x = PADDING + item.depth * INDENT_WIDTH;
    const entry = item.node.entry;
    const isHighlight = entry?.highlight === true;

    // Highlight background
    if (isHighlight) {
      parts.push(rect(PADDING / 2, y - 2, size.width - PADDING, ROW_HEIGHT, {
        fill: highlightBg,
        rx: 4,
        ry: 4,
      }));
    }

    // Tree connector lines
    if (item.depth > 0) {
      const lineX = PADDING + (item.depth - 1) * INDENT_WIDTH + INDENT_WIDTH / 2;
      // Vertical line from parent
      parts.push(line(lineX, y - ROW_HEIGHT / 2, lineX, y + ROW_HEIGHT / 2 - 4, {
        stroke: border,
        'stroke-width': 1,
      }));
      // Horizontal connector
      parts.push(line(lineX, y + ROW_HEIGHT / 2 - 4, x - 2, y + ROW_HEIGHT / 2 - 4, {
        stroke: border,
        'stroke-width': 1,
      }));
    }

    // Icon (folder or file)
    const icon = item.node.isDir ? '\uD83D\uDCC1' : '\uD83D\uDCC4';
    parts.push(text(x, y + ROW_HEIGHT / 2 + 1, icon, {
      'font-size': 12,
      'dominant-baseline': 'middle',
    }));

    // File/directory name
    const nameColor = isHighlight ? accent : fg;
    parts.push(text(x + ICON_WIDTH, y + ROW_HEIGHT / 2 + 1, item.node.name, {
      fill: nameColor,
      'font-size': 12,
      'font-weight': item.node.isDir ? 600 : 'normal',
      'font-family': MONO_FONT,
      'dominant-baseline': 'middle',
    }));

    // Technology tag
    if (entry?.technology) {
      const nameWidth = item.node.name.length * 7.5 + 8;
      parts.push(text(x + ICON_WIDTH + nameWidth, y + ROW_HEIGHT / 2 + 1, entry.technology, {
        fill: accent,
        'font-size': 10,
        'font-family': FONT_FAMILY,
        'dominant-baseline': 'middle',
        opacity: 0.8,
      }));
    }

    // Description (truncated)
    if (entry?.description) {
      const descMaxLen = 30;
      const descDisplay = entry.description.length > descMaxLen
        ? entry.description.substring(0, descMaxLen - 3) + '...'
        : entry.description;
      const descX = size.width - PADDING;
      parts.push(text(descX, y + ROW_HEIGHT / 2 + 1, descDisplay, {
        fill: muted,
        'font-size': 10,
        'font-family': FONT_FAMILY,
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
      }));
    }
  });

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as FileTreeData;
  const resolvedEntries = resolveEntries(data);
  const treeNodes = buildTree(resolvedEntries);
  const flat = flattenTree(treeNodes);

  const maxDepth = flat.reduce((max, item) => Math.max(max, item.depth), 0);
  const maxNameLen = flat.reduce((max, item) => {
    const entry = item.node.entry;
    const techLen = entry?.technology ? entry.technology.length * 6 + 12 : 0;
    return Math.max(max, item.depth * INDENT_WIDTH + ICON_WIDTH + item.node.name.length * 7.5 + techLen);
  }, 0);

  const width = Math.max(MIN_WIDTH, PADDING * 2 + maxNameLen + 150);
  const height = 44 + flat.length * ROW_HEIGHT + PADDING;

  return { width, height };
}
