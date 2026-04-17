import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { FlowChartData, FlowNode, FlowEdge } from '../../models/elements.js';
import {
  escapeHtml, roundedRect, rect, text, line, group, path, defs, marker,
  curvedPath, diamond, hexagon, parallelogram, circle, ellipse,
} from './svg-builder.js';

// ── Constants ────────────────────────────────────────────────────────────────

const FONT = "'Almarai','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";
const FONT_SIZE = 10;
const LABEL_SIZE = 8;
const CHAR_W = 6.5;
const MIN_NODE_W = 80;
const MAX_NODE_W = 180;
const NODE_H = 30;
const NODE_H_MULTI = 42;
const NODE_PAD_X = 16;
const NODE_GAP = 50;
const ROW_GAP = 72;
const PAD = 24;
const MAX_ROW_W = 800;

const COL_BG = 'hsl(160 10% 10%)';
const COL_TEXT = 'hsl(0 0% 95%)';
const COL_MUTED = 'hsl(155 5% 55%)';
const COL_CONN = 'hsl(155 5% 35%)';
const COL_START = 'hsl(152 55% 45%)';
const COL_START_BG = 'hsl(152 40% 15%)';
const COL_END = 'hsl(0 60% 55%)';
const COL_END_BG = 'hsl(0 40% 15%)';
const COL_DECISION = 'hsl(38 80% 55%)';
const COL_DECISION_BG = 'hsl(38 50% 15%)';
const COL_IO = 'hsl(280 45% 55%)';
const COL_IO_BG = 'hsl(280 30% 15%)';
const COL_PROCESS = 'hsl(200 50% 50%)';
const COL_PROCESS_BG = 'hsl(200 40% 15%)';
const COL_YES = 'hsl(152 55% 45%)';
const COL_NO = 'hsl(0 60% 55%)';

// ── Types ───────────────────────────────────────────────────────────────────

interface NodeLayout {
  id: string;
  node: FlowNode;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
}

// ── Text measurement ────────────────────────────────────────────────────────

function measureNode(node: FlowNode): { w: number; h: number; lines: string[] } {
  const rawLines = node.name.split('\\n');
  const lines: string[] = [];
  for (const l of rawLines) {
    if (l.length * CHAR_W > MAX_NODE_W - NODE_PAD_X * 2) {
      // Wrap long lines
      const words = l.split(' ');
      let cur = '';
      for (const word of words) {
        const test = cur ? cur + ' ' + word : word;
        if (test.length * CHAR_W > MAX_NODE_W - NODE_PAD_X * 2 && cur) {
          lines.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);
    } else {
      lines.push(l);
    }
  }

  const maxLineW = Math.max(...lines.map(l => l.length * CHAR_W));
  let w = Math.max(MIN_NODE_W, Math.min(MAX_NODE_W, maxLineW + NODE_PAD_X * 2));
  let h = lines.length > 1 ? lines.length * 14 + 12 : NODE_H;
  // Decision/diamond nodes: diamond is square rotated 45°, extends equally in all directions
  if (node.type === 'decision') {
    const diamondSize = Math.max(w, h) + 10;
    w = diamondSize;
    h = diamondSize;
  }
  return { w, h, lines };
}

// ── Topological sort ────────────────────────────────────────────────────────

function topoSort(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const n of nodes) { adj.set(n.id, []); inDeg.set(n.id, 0); }
  for (const e of edges) {
    adj.get(e.from)?.push(e.to);
    inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1);
  }
  const queue: string[] = [];
  for (const n of nodes) { if ((inDeg.get(n.id) || 0) === 0) queue.push(n.id); }
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) || []) {
      const d = (inDeg.get(next) || 1) - 1;
      inDeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  for (const n of nodes) { if (!order.includes(n.id)) order.push(n.id); }
  return order;
}

// ── Row-wrapping layout ─────────────────────────────────────────────────────

function layoutNodes(nodes: FlowNode[], edges: FlowEdge[]): { layouts: NodeLayout[]; totalW: number; totalH: number } {
  const order = topoSort(nodes, edges);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const measured = new Map<string, { w: number; h: number; lines: string[] }>();
  for (const n of nodes) measured.set(n.id, measureNode(n));

  // Build edge label width lookup: for each edge, how wide is its label?
  const edgeLabelW = new Map<string, number>(); // "from->to" => label width
  for (const edge of edges) {
    const label = edge.label || edge.condition || '';
    if (label) {
      const key = edge.from + '->' + edge.to;
      const w = label.length * CHAR_W + 20;
      edgeLabelW.set(key, Math.max(edgeLabelW.get(key) || 0, w));
      // Also reverse direction
      const revKey = edge.to + '->' + edge.from;
      edgeLabelW.set(revKey, Math.max(edgeLabelW.get(revKey) || 0, w));
    }
  }

  // Pack nodes into rows by wrapping at MAX_ROW_W
  const rows: string[][] = [[]];
  let rowW = 0;

  for (const id of order) {
    const m = measured.get(id)!;
    if (rowW > 0 && rowW + NODE_GAP + m.w > MAX_ROW_W) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1].push(id);
    rowW += (rowW > 0 ? NODE_GAP : 0) + m.w;
  }

  // Position nodes: center each row with dynamic gaps based on edge labels
  const layouts: NodeLayout[] = [];
  let y = PAD;
  let maxW = 0;

  for (const row of rows) {
    // Compute per-pair gaps for this row
    const pairGaps: number[] = [];
    for (let j = 0; j < row.length - 1; j++) {
      let gap = NODE_GAP;
      // Check edges between adjacent nodes in this row
      const key1 = row[j] + '->' + row[j + 1];
      const key2 = row[j + 1] + '->' + row[j];
      if (edgeLabelW.has(key1)) gap = Math.max(gap, edgeLabelW.get(key1)!);
      if (edgeLabelW.has(key2)) gap = Math.max(gap, edgeLabelW.get(key2)!);
      pairGaps.push(gap);
    }

    // Calculate row width with variable gaps
    let rw = 0;
    let rowH = 0;
    for (let j = 0; j < row.length; j++) {
      const m = measured.get(row[j])!;
      rw += m.w;
      rowH = Math.max(rowH, m.h);
      if (j < row.length - 1) rw += pairGaps[j];
    }
    maxW = Math.max(maxW, rw);

    // Center the row
    let x = PAD + (MAX_ROW_W - rw) / 2;
    if (x < PAD) x = PAD;

    for (let j = 0; j < row.length; j++) {
      const id = row[j];
      const m = measured.get(id)!;
      const node = nodeMap.get(id)!;
      layouts.push({
        id, node, x,
        y: y + (rowH - m.h) / 2,
        w: m.w, h: m.h,
        lines: m.lines,
      });
      x += m.w + (j < pairGaps.length ? pairGaps[j] : NODE_GAP);
    }

    y += rowH + ROW_GAP;
  }

  // Account for diamond shapes that extend beyond node boundaries
  // Check the actual rightmost extent of each node (including diamond overflow)
  let actualMaxX = 0;
  for (const nl of layouts) {
    let rightEdge = nl.x + nl.w;
    if (nl.node.type === 'decision') {
      // Diamond extends from cx - h/2 to cx + h/2
      const cx = nl.x + nl.w / 2;
      rightEdge = cx + nl.h / 2;
    }
    actualMaxX = Math.max(actualMaxX, rightEdge);
  }
  const totalW = Math.max(300, actualMaxX + PAD);
  const totalH = y + PAD;
  return { layouts, totalW, totalH };
}

// ── Node rendering ──────────────────────────────────────────────────────────

function renderNode(nl: NodeLayout): string {
  const { node, x, y, w, h, lines } = nl;
  const parts: string[] = [];
  const cx = x + w / 2;
  const cy = y + h / 2;

  switch (node.type) {
    case 'start':
      parts.push(ellipse(cx, cy, w / 2, h / 2, { fill: COL_START_BG, stroke: COL_START, 'stroke-width': 1.5 }));
      break;
    case 'end':
      parts.push(ellipse(cx, cy, w / 2, h / 2, { fill: COL_END_BG, stroke: COL_END, 'stroke-width': 1.5 }));
      break;
    case 'decision':
      parts.push(diamond(cx, cy, h, COL_DECISION_BG, COL_DECISION));
      break;
    case 'io':
      parts.push(parallelogram(x, y, w, h, COL_IO_BG, COL_IO));
      break;
    case 'subprocess':
      parts.push(roundedRect(x, y, w, h, 4, { fill: COL_PROCESS_BG, stroke: COL_PROCESS, 'stroke-width': 1.5 }));
      parts.push(roundedRect(x + 3, y + 3, w - 6, h - 6, 3, { fill: 'none', stroke: COL_PROCESS, 'stroke-width': 0.5, opacity: '0.4' }));
      break;
    case 'delay':
      parts.push(path(`M ${x} ${y} L ${x + w - h / 2} ${y} A ${h / 2} ${h / 2} 0 0 1 ${x + w - h / 2} ${y + h} L ${x} ${y + h} Z`, { fill: COL_PROCESS_BG, stroke: COL_MUTED, 'stroke-width': 1.5 }));
      break;
    case 'loop':
      parts.push(roundedRect(x, y, w, h, 4, { fill: COL_DECISION_BG, stroke: COL_DECISION, 'stroke-width': 1.5, 'stroke-dasharray': '4 2' }));
      break;
    default: // process
      parts.push(roundedRect(x, y, w, h, 4, { fill: COL_PROCESS_BG, stroke: COL_PROCESS, 'stroke-width': 1.5 }));
      break;
  }

  // Render text lines
  if (lines.length === 1) {
    parts.push(text(cx, cy + 1, lines[0], { fill: COL_TEXT, 'font-size': FONT_SIZE, 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }));
  } else {
    const lineH = 12;
    const startY = cy - ((lines.length - 1) * lineH) / 2;
    const tspans = lines.map((l, i) => `<tspan x="${cx}" ${i > 0 ? `dy="${lineH}"` : ''}>${escapeHtml(l)}</tspan>`).join('');
    parts.push(`<text x="${cx}" y="${startY}" fill="${COL_TEXT}" font-size="${FONT_SIZE}" font-weight="bold" font-family="${FONT}" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`);
  }

  return group(parts, undefined, { 'data-node-id': node.id });
}

// ── Edge rendering ──────────────────────────────────────────────────────────

function renderEdge(edge: FlowEdge, layoutMap: Map<string, NodeLayout>): string {
  const from = layoutMap.get(edge.from);
  const to = layoutMap.get(edge.to);
  if (!from || !to) return '';
  const parts: string[] = [];

  // Connection points
  let x1: number, y1: number, x2: number, y2: number;
  const sameRow = Math.abs(from.y + from.h / 2 - (to.y + to.h / 2)) < from.h;

  if (sameRow) {
    // Same row: connect side to side
    if (from.x < to.x) {
      x1 = from.x + from.w; y1 = from.y + from.h / 2;
      x2 = to.x; y2 = to.y + to.h / 2;
    } else {
      x1 = from.x; y1 = from.y + from.h / 2;
      x2 = to.x + to.w; y2 = to.y + to.h / 2;
    }
  } else {
    // Different rows: bottom to top
    x1 = from.x + from.w / 2; y1 = from.y + from.h;
    x2 = to.x + to.w / 2; y2 = to.y;
  }

  const label = (edge.label || edge.condition || '').toLowerCase();
  let strokeColor = COL_CONN;
  let markerRef = 'url(#fc-arrow)';
  if (label === 'yes' || label === 'true' || label.startsWith('yes')) { strokeColor = COL_YES; markerRef = 'url(#fc-arrow-yes)'; }
  else if (label === 'no' || label === 'false' || label.startsWith('no')) { strokeColor = COL_NO; markerRef = 'url(#fc-arrow-no)'; }

  const pathD = curvedPath(x1, y1, x2, y2);
  parts.push(path(pathD, { fill: 'none', stroke: strokeColor, 'stroke-width': 1.2, 'marker-end': markerRef }));

  // Edge label
  const edgeLabel = edge.label || edge.condition;
  if (edgeLabel) {
    const mx = (x1 + x2) / 2 + (sameRow ? 0 : 8);
    const my = (y1 + y2) / 2;
    const labelW = edgeLabel.length * 5.5 + 8;
    parts.push(roundedRect(mx - labelW / 2, my - 7, labelW, 14, 3, { fill: COL_BG, stroke: strokeColor, 'stroke-width': 0.5 }));
    parts.push(text(mx, my + 1, edgeLabel, { fill: strokeColor, 'font-size': LABEL_SIZE, 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }));
  }

  return group(parts, undefined, { 'data-conn-from': edge.from, 'data-conn-to': edge.to });
}

// ── Arrow defs ──────────────────────────────────────────────────────────────

function arrowDefs(): string {
  return defs(
    marker('fc-arrow', 9, 5, 10, 10, path('M 0 0 L 10 5 L 0 10 z', { fill: COL_CONN })) +
    marker('fc-arrow-yes', 9, 5, 10, 10, path('M 0 0 L 10 5 L 0 10 z', { fill: COL_YES })) +
    marker('fc-arrow-no', 9, 5, 10, 10, path('M 0 0 L 10 5 L 0 10 z', { fill: COL_NO }))
  );
}

// ── Public API ──────────────────────────────────────────────────────────────

export function render(element: Element): string {
  const data = element.data as FlowChartData;
  const rawNodes = data.nodes || (data as any).steps || [];
  const nodes = rawNodes.map((n: any) => ({ ...n, name: n.name || n.label || '' }));
  const edges = (data.edges || (data as any).connections || []).map((e: any) => ({ ...e, from: e.from || e.source || '', to: e.to || e.target || '' }));
  if (nodes.length === 0) return text(60, 40, 'No nodes defined', { fill: COL_MUTED, 'font-size': FONT_SIZE, 'font-family': FONT });

  const { layouts } = layoutNodes(nodes, edges);
  const layoutMap = new Map(layouts.map(l => [l.id, l]));
  const parts: string[] = [arrowDefs()];

  for (const edge of edges) parts.push(renderEdge(edge, layoutMap));
  for (const nl of layouts) parts.push(renderNode(nl));

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as FlowChartData;
  const rawNodes = data.nodes || (data as any).steps || [];
  const nodes = rawNodes.map((n: any) => ({ ...n, name: n.name || n.label || '' }));
  const edges = (data.edges || (data as any).connections || []).map((e: any) => ({ ...e, from: e.from || e.source || '', to: e.to || e.target || '' }));
  if (nodes.length === 0) return { width: 300, height: 100 };
  const { totalW, totalH } = layoutNodes(nodes, edges);
  return { width: Math.max(300, totalW), height: Math.max(150, totalH) };
}
