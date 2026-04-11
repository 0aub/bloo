import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { DependencyGraphData, DependencyNode, DependencyEdge } from '../../models/elements.js';
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

const NODE_MIN_W = 140;
const NODE_H = 48;
const NODE_PAD_X = 16;
const GRID_GAP_X = 52;
const GRID_GAP_Y = 52;
const CANVAS_PAD = 36;
const CORNER_R = 8;

const COL_BG = 'hsl(160 10% 10%)';
const COL_CARD_BG = 'hsl(160 10% 10% / 0.8)';
const COL_TEXT = 'hsl(0 0% 95%)';
const COL_MUTED = 'hsl(155 5% 55%)';
const COL_BORDER = 'hsl(160 8% 18%)';
const COL_ACCENT = 'hsl(152 65% 55%)';
const COL_CONN = 'hsl(155 5% 35%)';

const COL_INTERNAL = 'hsl(200 60% 50%)';
const COL_INTERNAL_BG = 'hsl(200 40% 13%)';
const COL_EXTERNAL = 'hsl(155 5% 40%)';
const COL_EXTERNAL_BG = 'hsl(155 5% 12%)';
const COL_DEV = 'hsl(155 5% 30%)';
const COL_DEV_BG = 'hsl(155 5% 10%)';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface NodeLayout {
  id: string;
  node: DependencyNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

function measureText(s: string, fontSize: number): number {
  return s.length * fontSize * 0.6;
}

function nodeWidth(n: DependencyNode): number {
  const nameW = measureText(n.name, BODY_SIZE);
  const versionW = n.version ? measureText(n.version, LABEL_SIZE) : 0;
  return Math.max(NODE_MIN_W, Math.max(nameW, versionW) + NODE_PAD_X * 2);
}

function arrowDefs(): string {
  const arrow = marker(
    'dep-arrow',
    9,
    5,
    10,
    10,
    path('M 0 0 L 10 5 L 0 10 z', { fill: COL_CONN }),
  );
  const arrowImport = marker(
    'dep-arrow-import',
    9,
    5,
    10,
    10,
    path('M 0 0 L 10 5 L 0 10 z', { fill: COL_INTERNAL }),
  );
  const arrowPeer = marker(
    'dep-arrow-peer',
    9,
    5,
    10,
    10,
    path('M 0 0 L 10 5 L 0 10 z', { fill: COL_ACCENT }),
  );
  return defs(arrow + arrowImport + arrowPeer);
}

// ── Node rendering ───────────────────────────────────────────────────────────

function renderNode(nl: NodeLayout): string {
  const { node, x, y, w, h } = nl;
  const parts: string[] = [];

  let fillColor: string;
  let borderColor: string;
  let dashArray: string | undefined;

  switch (node.type) {
    case 'internal':
      fillColor = COL_INTERNAL_BG;
      borderColor = COL_INTERNAL;
      break;
    case 'external':
      fillColor = COL_EXTERNAL_BG;
      borderColor = COL_EXTERNAL;
      dashArray = '6 3';
      break;
    case 'devDependency':
      fillColor = COL_DEV_BG;
      borderColor = COL_DEV;
      dashArray = '3 3';
      break;
    default:
      fillColor = COL_CARD_BG;
      borderColor = COL_BORDER;
  }

  // Node shape: rounded rect
  parts.push(
    roundedRect(x, y, w, h, CORNER_R, {
      fill: fillColor,
      stroke: borderColor,
      'stroke-width': 1.5,
      'stroke-dasharray': dashArray,
    }),
  );

  // Type badge: small coloured dot in top-left
  const badgeColors: Record<string, string> = {
    internal: COL_INTERNAL,
    external: COL_EXTERNAL,
    devDependency: COL_DEV,
  };
  parts.push(
    circle(x + 12, y + 12, 3, {
      fill: badgeColors[node.type] || COL_MUTED,
      stroke: 'none',
    }),
  );

  // Node name
  const nameY = node.version ? y + h / 2 - 4 : y + h / 2 + 1;
  parts.push(
    text(x + w / 2, nameY, node.name, {
      fill: COL_TEXT,
      'font-size': BODY_SIZE,
      'font-weight': 'bold',
      'font-family': FONT,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    }),
  );

  // Version label below name
  if (node.version) {
    parts.push(
      text(x + w / 2, nameY + 16, node.version, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE,
        'font-family': MONO,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }),
    );
  }

  return group(parts, undefined, { 'data-node-id': nl.node.id });
}

// ── Edge rendering ───────────────────────────────────────────────────────────

function renderEdge(
  edge: DependencyEdge,
  layoutMap: Map<string, NodeLayout>,
): string {
  const from = layoutMap.get(edge.from);
  const to = layoutMap.get(edge.to);
  if (!from || !to) return '';

  const parts: string[] = [];

  // Determine connection points
  const fromCx = from.x + from.w / 2;
  const fromCy = from.y + from.h / 2;
  const toCx = to.x + to.w / 2;
  const toCy = to.y + to.h / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const angle = Math.atan2(dy, dx);

  function edgePoint(
    cx: number,
    cy: number,
    hw: number,
    hh: number,
    a: number,
  ): { x: number; y: number } {
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const tX = cosA !== 0 ? hw / Math.abs(cosA) : Infinity;
    const tY = sinA !== 0 ? hh / Math.abs(sinA) : Infinity;
    const t = Math.min(tX, tY);
    return { x: cx + cosA * t, y: cy + sinA * t };
  }

  const p1 = edgePoint(fromCx, fromCy, from.w / 2 + 4, from.h / 2 + 4, angle);
  const p2 = edgePoint(toCx, toCy, to.w / 2 + 4, to.h / 2 + 4, angle + Math.PI);

  // Edge style by type
  let strokeColor = COL_CONN;
  let markerRef = 'url(#dep-arrow)';
  let dash: string | undefined;

  const edgeType = edge.type || 'depends_on';
  if (edgeType === 'imports') {
    strokeColor = COL_INTERNAL;
    markerRef = 'url(#dep-arrow-import)';
  } else if (edgeType === 'peer') {
    strokeColor = COL_ACCENT;
    markerRef = 'url(#dep-arrow-peer)';
    dash = '4 3';
  }

  // Curved connection path
  const pathD = curvedPath(p1.x, p1.y, p2.x, p2.y);
  parts.push(
    path(pathD, {
      fill: 'none',
      stroke: strokeColor,
      'stroke-width': 1.5,
      'stroke-dasharray': dash,
      'marker-end': markerRef,
      opacity: '0.75',
    }),
  );

  // Edge type label at midpoint
  if (edge.type) {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 - 8;
    parts.push(
      text(mx, my, edge.type, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE - 1,
        'font-family': MONO,
        'text-anchor': 'middle',
        opacity: '0.7',
      }),
    );
  }

  return group(parts, undefined, { 'data-conn-from': edge.from, 'data-conn-to': edge.to });
}

// ── Grid layout (force-like) ─────────────────────────────────────────────────

function layoutGrid(
  nodes: DependencyNode[],
  edges: DependencyEdge[],
): { layouts: NodeLayout[]; totalW: number; totalH: number } {
  const layouts: NodeLayout[] = [];

  // Group by type for better organisation: internal first, then external, then devDeps
  const typeOrder: DependencyNode['type'][] = ['internal', 'external', 'devDependency'];
  const sorted = [...nodes].sort(
    (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type),
  );

  // Compute incoming edges to hint at depth ordering
  const inDeg = new Map<string, number>();
  for (const n of nodes) inDeg.set(n.id, 0);
  for (const e of edges) inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1);

  // Sort within type groups: fewer incoming edges first (roots first)
  sorted.sort((a, b) => {
    const typeA = typeOrder.indexOf(a.type);
    const typeB = typeOrder.indexOf(b.type);
    if (typeA !== typeB) return typeA - typeB;
    return (inDeg.get(a.id) || 0) - (inDeg.get(b.id) || 0);
  });

  const cols = Math.max(2, Math.ceil(Math.sqrt(sorted.length)));
  let rowX = CANVAS_PAD;
  let rowY = CANVAS_PAD;
  let colI = 0;
  let rowMaxH = 0;
  let maxW = 0;

  for (const n of sorted) {
    const w = nodeWidth(n);
    const h = NODE_H;
    layouts.push({ id: n.id, node: n, x: rowX, y: rowY, w, h });
    rowMaxH = Math.max(rowMaxH, h);
    colI++;
    if (colI >= cols) {
      maxW = Math.max(maxW, rowX + w);
      colI = 0;
      rowX = CANVAS_PAD;
      rowY += rowMaxH + GRID_GAP_Y;
      rowMaxH = 0;
    } else {
      rowX += w + GRID_GAP_X;
    }
  }

  maxW = Math.max(maxW, rowX);
  return {
    layouts,
    totalW: maxW + CANVAS_PAD,
    totalH: rowY + rowMaxH + CANVAS_PAD,
  };
}

// ── Legend ────────────────────────────────────────────────────────────────────

function renderLegend(x: number, y: number): string {
  const parts: string[] = [];
  const items: Array<{ label: string; color: string; dash?: string }> = [
    { label: 'Internal', color: COL_INTERNAL },
    { label: 'External', color: COL_EXTERNAL, dash: '6 3' },
    { label: 'Dev Dependency', color: COL_DEV, dash: '3 3' },
  ];

  let curX = x;
  for (const item of items) {
    // Colour swatch
    parts.push(
      roundedRect(curX, y, 12, 12, 2, {
        fill: 'none',
        stroke: item.color,
        'stroke-width': 1.5,
        'stroke-dasharray': item.dash,
      }),
    );
    // Label
    parts.push(
      text(curX + 18, y + 10, item.label, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE,
        'font-family': FONT,
      }),
    );
    curX += item.label.length * 6 + 36;
  }

  return group(parts);
}

// ── Public API ───────────────────────────────────────────────────────────────

export function render(element: Element): string {
  const data = element.data as DependencyGraphData;
  const nodes = data.nodes || [];
  const edges = data.edges || [];

  if (nodes.length === 0) {
    return group([
      text(60, 40, 'No dependencies defined', {
        fill: COL_MUTED,
        'font-size': BODY_SIZE,
        'font-family': FONT,
      }),
    ]);
  }

  const { layouts, totalW, totalH } = layoutGrid(nodes, edges);
  const layoutMap = new Map(layouts.map((l) => [l.id, l]));

  const parts: string[] = [];

  // Arrow marker defs
  parts.push(arrowDefs());

  // Legend at bottom
  parts.push(renderLegend(CANVAS_PAD, totalH));

  // Edges (behind nodes)
  for (const edge of edges) {
    parts.push(renderEdge(edge, layoutMap));
  }

  // Nodes
  for (const nl of layouts) {
    parts.push(renderNode(nl));
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as DependencyGraphData;
  const nodes = data.nodes || [];
  const edges = data.edges || [];

  if (nodes.length === 0) return { width: 300, height: 100 };

  const { totalW, totalH } = layoutGrid(nodes, edges);
  // Extra height for legend
  return {
    width: Math.max(300, totalW),
    height: Math.max(200, totalH + 30),
  };
}
