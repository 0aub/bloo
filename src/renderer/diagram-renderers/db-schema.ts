import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { DbSchemaData, DbTable, DbRelationship } from '../../models/elements.js';
import {
  escapeHtml,
  roundedRect,
  rect,
  text,
  line,
  group,
  path,
  defs,
  marker,
  curvedPath,
  cylinder,
  diamond,
  hexagon,
  parallelogram,
  circle,
  foreignObject,
  ellipse,
} from './svg-builder.js';
import { getComponentColor } from '../theme.js';

// ── Constants ────────────────────────────────────────────────────────────────

const FONT = "'Almarai','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";
const TITLE_SIZE = 12;
const BODY_SIZE = 11;
const LABEL_SIZE = 9;

const TABLE_MIN_W = 220;
const HEADER_H = 28;
const ROW_H = 24;
const TABLE_PAD = 16;
const GRID_GAP_X = 80;
const GRID_GAP_Y = 80;
const CANVAS_PAD = 30;
const CORNER_R = 6;

const COL_BG = 'hsl(160 10% 10%)';
const COL_CARD_BG = 'hsl(160 10% 10%)';
const COL_TEXT = 'hsl(0 0% 95%)';
const COL_MUTED = 'hsl(155 5% 55%)';
const COL_BORDER = 'hsl(160 8% 25%)';
const COL_ACCENT = 'hsl(152 65% 55%)';
const COL_CONN = 'hsl(155 5% 45%)';
const COL_HEADER_BG = 'hsl(160 8% 13%)';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface TableLayout {
  id: string;
  table: DbTable;
  x: number;
  y: number;
  w: number;
  h: number;
}

function measureText(s: string, fontSize: number): number {
  return s.length * fontSize * 0.6;
}

function tableSize(t: DbTable): { w: number; h: number } {
  const nameW = measureText(t.name || '', TITLE_SIZE) + TABLE_PAD * 2 + 20;
  let maxColW = 0;
  for (const col of t.columns || []) {
    const colText = `${col.primary_key ? '🔑 ' : ''}${col.name || ''}  ${col.type || ''}`;
    maxColW = Math.max(maxColW, measureText(colText, BODY_SIZE));
  }
  const w = Math.max(TABLE_MIN_W, maxColW + TABLE_PAD * 2 + 16);
  const h = HEADER_H + (t.columns || []).length * ROW_H + 4;
  return { w, h };
}

// ── Table card rendering ─────────────────────────────────────────────────────

function renderTable(tl: TableLayout): string {
  const { table: _table, x, y, w, h } = tl;
  const table = { ..._table, id: _table.id || '', name: _table.name || '', schema: _table.schema || '', columns: _table.columns || [] };
  const parts: string[] = [];

  // Card background
  parts.push(
    roundedRect(x, y, w, h, CORNER_R, {
      fill: COL_CARD_BG,
      stroke: COL_BORDER,
      'stroke-width': 1.5,
    }),
  );

  // Header background
  parts.push(
    `<clipPath id="clip-hdr-${escapeHtml(table.id)}"><rect x="${x}" y="${y}" width="${w}" height="${HEADER_H}" rx="${CORNER_R}" ry="${CORNER_R}"/><rect x="${x}" y="${y + CORNER_R}" width="${w}" height="${HEADER_H - CORNER_R}"/></clipPath>`,
  );
  parts.push(
    rect(x, y, w, HEADER_H, {
      fill: COL_HEADER_BG,
      'clip-path': `url(#clip-hdr-${escapeHtml(table.id)})`,
    }),
  );

  // Header divider
  parts.push(
    line(x, y + HEADER_H, x + w, y + HEADER_H, {
      stroke: COL_BORDER,
      'stroke-width': 1,
    }),
  );

  // Table icon + name
  const schemaPrefix = table.schema ? `${table.schema}.` : '';
  parts.push(
    text(x + TABLE_PAD, y + HEADER_H / 2 + 1, `${schemaPrefix}${table.name}`, {
      fill: COL_TEXT,
      'font-size': TITLE_SIZE,
      'font-weight': 'bold',
      'font-family': FONT,
      'dominant-baseline': 'middle',
    }),
  );

  // Column rows
  let rowY = y + HEADER_H + 2;
  for (const col of table.columns) {
    // Alternating subtle stripe
    if (table.columns.indexOf(col) % 2 === 1) {
      parts.push(
        rect(x + 1, rowY, w - 2, ROW_H, {
          fill: 'hsl(160 8% 11%)',
        }),
      );
    }

    const midY = rowY + ROW_H / 2;

    // PK icon
    if (col.primary_key) {
      parts.push(
        text(x + TABLE_PAD, midY, '🔑', {
          'font-size': LABEL_SIZE,
          'dominant-baseline': 'middle',
        }),
      );
    }

    const nameX = x + TABLE_PAD + (col.primary_key ? 18 : 0);

    // Column name
    parts.push(
      text(nameX, midY, col.name, {
        fill: COL_TEXT,
        'font-size': BODY_SIZE,
        'font-family': FONT,
        'dominant-baseline': 'middle',
      }),
    );

    // Column type (right-aligned)
    const typeStr = (col.type || '') + (col.nullable ? '?' : '') + (col.unique ? ' (U)' : '');
    parts.push(
      text(x + w - TABLE_PAD, midY, typeStr, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE,
        'font-family': MONO,
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
      }),
    );

    rowY += ROW_H;
  }

  return group(parts, undefined, { 'data-node-id': table.id });
}

// ── Crow's foot relationship rendering ───────────────────────────────────────

function crowsFoot(
  x: number,
  y: number,
  side: 'left' | 'right',
  kind: 'one' | 'many',
): string {
  const parts: string[] = [];
  const dir = side === 'right' ? 1 : -1;

  if (kind === 'one') {
    // Two vertical bars ||
    parts.push(
      line(x + dir * 4, y - 6, x + dir * 4, y + 6, {
        stroke: COL_CONN,
        'stroke-width': 1.5,
      }),
    );
    parts.push(
      line(x + dir * 9, y - 6, x + dir * 9, y + 6, {
        stroke: COL_CONN,
        'stroke-width': 1.5,
      }),
    );
  } else {
    // Fork / crow's foot  < or >
    parts.push(
      line(x + dir * 10, y, x, y - 7, {
        stroke: COL_CONN,
        'stroke-width': 1.5,
      }),
    );
    parts.push(
      line(x + dir * 10, y, x, y, {
        stroke: COL_CONN,
        'stroke-width': 1.5,
      }),
    );
    parts.push(
      line(x + dir * 10, y, x, y + 7, {
        stroke: COL_CONN,
        'stroke-width': 1.5,
      }),
    );
  }

  return group(parts);
}

function renderRelationship(
  rel: DbRelationship,
  layoutMap: Map<string, TableLayout>,
): string {
  const from = layoutMap.get(rel.from_table);
  const to = layoutMap.get(rel.to_table);
  if (!from || !to) return '';

  // Find y position at the column row
  const fromColIdx = from.table.columns.findIndex((c) => c.name === rel.from_column);
  const toColIdx = to.table.columns.findIndex((c) => c.name === rel.to_column);
  const fromY =
    from.y + HEADER_H + (fromColIdx >= 0 ? fromColIdx : 0) * ROW_H + ROW_H / 2 + 2;
  const toY =
    to.y + HEADER_H + (toColIdx >= 0 ? toColIdx : 0) * ROW_H + ROW_H / 2 + 2;

  // Smart connection points: pick closest edges based on relative position
  const fromCX = from.x + from.w / 2;
  const toCX = to.x + to.w / 2;
  const fromCY = from.y + from.h / 2;
  const toCY = to.y + to.h / 2;

  let fromX: number, toX: number;
  if (Math.abs(fromCX - toCX) > Math.abs(fromCY - toCY)) {
    // Tables are more horizontal than vertical — connect left/right edges
    if (fromCX < toCX) {
      fromX = from.x + from.w; // right edge
      toX = to.x;              // left edge
    } else {
      fromX = from.x;          // left edge
      toX = to.x + to.w;       // right edge
    }
  } else {
    // Tables are more vertical — connect top/bottom edges via side
    if (fromCY < toCY) {
      fromX = from.x + from.w; // right edge going down
      toX = to.x + to.w;       // right edge of target
    } else {
      fromX = from.x;          // left edge going up
      toX = to.x;              // left edge of target
    }
  }

  const parts: string[] = [];

  // Connection line with offset to avoid overlapping table edges
  const offsetX = fromX > toX ? -14 : 14;
  const pathD = curvedPath(fromX + offsetX, fromY, toX - offsetX, toY);
  parts.push(
    path(pathD, {
      fill: 'none',
      stroke: COL_CONN,
      'stroke-width': 1.5,
    }),
  );

  // Crow's foot notation — direction based on which edge we're connecting from
  const fromSide = fromX >= from.x + from.w / 2 ? 'right' : 'left';
  const toSide = toX >= to.x + to.w / 2 ? 'right' : 'left';
  if (rel.type === 'one_to_one') {
    parts.push(crowsFoot(fromX, fromY, fromSide as any, 'one'));
    parts.push(crowsFoot(toX, toY, toSide as any, 'one'));
  } else if (rel.type === 'one_to_many') {
    parts.push(crowsFoot(fromX, fromY, fromSide as any, 'one'));
    parts.push(crowsFoot(toX, toY, toSide as any, 'many'));
  } else {
    parts.push(crowsFoot(fromX, fromY, fromSide as any, 'many'));
    parts.push(crowsFoot(toX, toY, toSide as any, 'many'));
  }

  // Label
  if (rel.label) {
    const mx = (fromX + toX) / 2;
    const my = (fromY + toY) / 2 - 10;
    parts.push(
      text(mx, my, rel.label, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE,
        'font-family': FONT,
        'text-anchor': 'middle',
      }),
    );
  }

  return group(parts, undefined, { 'data-conn-from': rel.from_table, 'data-conn-to': rel.to_table });
}

// ── Layout ───────────────────────────────────────────────────────────────────

function layoutTables(
  tables: DbTable[],
): { layouts: TableLayout[]; totalW: number; totalH: number } {
  const layouts: TableLayout[] = [];
  const cols = Math.max(2, Math.ceil(Math.sqrt(tables.length)));
  let rowX = CANVAS_PAD;
  let rowY = CANVAS_PAD;
  let colI = 0;
  let rowMaxH = 0;
  let maxW = 0;

  for (const t of tables) {
    const s = tableSize(t);
    layouts.push({ id: t.id, table: t, x: rowX, y: rowY, w: s.w, h: s.h });
    rowMaxH = Math.max(rowMaxH, s.h);
    colI++;
    if (colI >= cols) {
      maxW = Math.max(maxW, rowX + s.w);
      colI = 0;
      rowX = CANVAS_PAD;
      rowY += rowMaxH + GRID_GAP_Y;
      rowMaxH = 0;
    } else {
      rowX += s.w + GRID_GAP_X;
    }
  }

  maxW = Math.max(maxW, rowX);
  return {
    layouts,
    totalW: maxW + CANVAS_PAD,
    totalH: rowY + rowMaxH + CANVAS_PAD,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function render(element: Element): string {
  const data = element.data as DbSchemaData;
  const tables = data.tables || [];
  const relationships = data.relationships || [];

  if (tables.length === 0) {
    return group([
      text(60, 40, 'No tables defined', {
        fill: COL_MUTED,
        'font-size': BODY_SIZE,
        'font-family': FONT,
      }),
    ]);
  }

  const { layouts, totalW, totalH } = layoutTables(tables);
  const layoutMap = new Map(layouts.map((l) => [l.id, l]));

  const parts: string[] = [];

  // Clip-path defs for table headers
  const clipDefs = layouts
    .map(
      (tl) =>
        `<clipPath id="clip-hdr-${escapeHtml(tl.id)}"><rect x="${tl.x}" y="${tl.y}" width="${tl.w}" height="${HEADER_H}" rx="${CORNER_R}" ry="${CORNER_R}"/><rect x="${tl.x}" y="${tl.y + CORNER_R}" width="${tl.w}" height="${HEADER_H - CORNER_R}"/></clipPath>`,
    )
    .join('');
  parts.push(defs(clipDefs));

  // Relationships (behind tables)
  for (const rel of relationships) {
    parts.push(renderRelationship(rel, layoutMap));
  }

  // Tables
  for (const tl of layouts) {
    parts.push(renderTable(tl));
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as DbSchemaData;
  const tables = data.tables || [];

  if (tables.length === 0) return { width: 300, height: 100 };

  const { totalW, totalH } = layoutTables(tables);
  return { width: Math.max(300, totalW), height: Math.max(200, totalH) };
}
