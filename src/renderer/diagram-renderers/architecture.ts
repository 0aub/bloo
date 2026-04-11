import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type {
  ArchitectureDiagramData,
  ArchitectureComponent,
  ArchitectureConnection,
  ArchitectureLayer,
} from '../../models/elements.js';
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
const TITLE_SIZE = 14;
const BODY_SIZE = 12;
const LABEL_SIZE = 10;

const COMP_MIN_W = 130;
const COMP_MIN_H = 60;
const COMP_PAD_X = 20;
const COMP_PAD_Y = 16;
const GRID_GAP_X = 44;
const GRID_GAP_Y = 44;
const LAYER_PAD = 24;
const LAYER_LABEL_H = 32;
const CANVAS_PAD = 32;

const COL_BG = 'hsl(160 10% 10%)';
const COL_CARD_BG = 'hsl(160 10% 10%)';
const COL_TEXT = 'hsl(0 0% 95%)';
const COL_MUTED = 'hsl(155 5% 55%)';
const COL_BORDER = 'hsl(160 8% 18%)';
const COL_ACCENT = 'hsl(152 65% 55%)';
const COL_CONN = 'hsl(155 5% 35%)';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface CompLayout {
  id: string;
  comp: ArchitectureComponent;
  x: number;
  y: number;
  w: number;
  h: number;
}

function measureText(s: string, fontSize: number): number {
  return s.length * fontSize * 0.6;
}

function componentSize(c: ArchitectureComponent): { w: number; h: number } {
  const nameW = measureText(c.name, TITLE_SIZE);
  const techW = c.technology ? measureText(c.technology, LABEL_SIZE) : 0;
  const w = Math.max(COMP_MIN_W, Math.max(nameW, techW) + COMP_PAD_X * 2);
  const h = c.technology ? COMP_MIN_H + 8 : COMP_MIN_H;
  return { w, h };
}

function arrowDefs(): string {
  const arrowMarker = marker(
    'arrow',
    9,
    5,
    10,
    10,
    path('M 0 0 L 10 5 L 0 10 z', { fill: COL_CONN }),
  );
  const arrowAccent = marker(
    'arrow-accent',
    9,
    5,
    10,
    10,
    path('M 0 0 L 10 5 L 0 10 z', { fill: COL_ACCENT }),
  );
  return defs(arrowMarker + arrowAccent);
}

// ── Component shape rendering ────────────────────────────────────────────────

function renderComponent(cl: CompLayout): string {
  const { comp, x, y, w, h } = cl;
  const colors = getComponentColor(comp.type);
  const parts: string[] = [];

  switch (comp.type) {
    case 'database':
      parts.push(cylinder(x, y, w, h - 10, colors.fill, colors.border));
      break;

    case 'queue':
      parts.push(parallelogram(x, y, w, h, colors.fill, colors.border));
      break;

    case 'cache':
      parts.push(
        diamond(x + w / 2, y + h / 2, Math.max(w, h), colors.fill, colors.border),
      );
      break;

    case 'gateway':
      parts.push(
        hexagon(x + w / 2, y + h / 2, Math.max(w, h), colors.fill, colors.border),
      );
      break;

    case 'container':
      parts.push(
        roundedRect(x, y, w, h, 8, {
          fill: 'transparent',
          stroke: colors.border,
          'stroke-width': 1.5,
          'stroke-dasharray': '6 3',
        }),
      );
      break;

    default:
      // service, client, external, worker, storage, cdn, load_balancer
      parts.push(
        roundedRect(x, y, w, h, 8, {
          fill: colors.fill,
          stroke: colors.border,
          'stroke-width': 1.5,
        }),
      );
      break;
  }

  // Name label — centred
  const nameY = comp.technology ? y + h / 2 - 4 : y + h / 2 + 5;
  parts.push(
    text(x + w / 2, nameY, comp.name, {
      fill: COL_TEXT,
      'font-size': TITLE_SIZE,
      'font-weight': 'bold',
      'font-family': FONT,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    }),
  );

  // Technology sub-label
  if (comp.technology) {
    parts.push(
      text(x + w / 2, nameY + 16, comp.technology, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE,
        'font-family': MONO,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }),
    );
  }

  return group(parts, undefined, { 'data-node-id': comp.id });
}

// ── Connection rendering ─────────────────────────────────────────────────────

function renderConnection(
  conn: ArchitectureConnection,
  layoutMap: Map<string, CompLayout>,
): string {
  const from = layoutMap.get(conn.from);
  const to = layoutMap.get(conn.to);
  if (!from || !to) return '';

  // Connection points: centre of each component
  const x1 = from.x + from.w / 2;
  const y1 = from.y + from.h / 2;
  const x2 = to.x + to.w / 2;
  const y2 = to.y + to.h / 2;

  // Calculate edge exit/entry points
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);

  // Simple edge-point calculation: project from centre to bounding rect
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

  const p1 = edgePoint(x1, y1, from.w / 2 + 4, from.h / 2 + 4, angle);
  const p2 = edgePoint(x2, y2, to.w / 2 + 4, to.h / 2 + 4, angle + Math.PI);

  const parts: string[] = [];

  const pathD = curvedPath(p1.x, p1.y, p2.x, p2.y);
  const strokeDash = conn.async ? '6 4' : undefined;

  parts.push(
    path(pathD, {
      fill: 'none',
      stroke: COL_CONN,
      'stroke-width': 1.5,
      'stroke-dasharray': strokeDash,
      'marker-end': 'url(#arrow)',
    }),
  );

  // Bidirectional arrow
  if (conn.direction === 'bidirectional') {
    parts.push(
      path(curvedPath(p2.x, p2.y, p1.x, p1.y), {
        fill: 'none',
        stroke: COL_CONN,
        'stroke-width': 1.5,
        'stroke-dasharray': strokeDash,
        'marker-end': 'url(#arrow)',
      }),
    );
  }

  // Connection label
  if (conn.label) {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 - 8;
    parts.push(
      text(mx, my, conn.label, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE,
        'font-family': FONT,
        'text-anchor': 'middle',
        'dominant-baseline': 'auto',
      }),
    );
  }

  // Protocol sub-label
  if (conn.protocol) {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 + 10;
    parts.push(
      text(mx, my, conn.protocol, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE - 1,
        'font-family': MONO,
        'text-anchor': 'middle',
        opacity: '0.7',
      }),
    );
  }

  return group(parts, undefined, { 'data-conn-from': conn.from, 'data-conn-to': conn.to });
}

// ── Layout engines ───────────────────────────────────────────────────────────

function layoutWithLayers(
  components: ArchitectureComponent[],
  layers: ArchitectureLayer[],
): { layouts: CompLayout[]; totalW: number; totalH: number } {
  const layouts: CompLayout[] = [];
  const compMap = new Map(components.map((c) => [c.id, c]));

  let curY = CANVAS_PAD;
  let maxW = 0;

  for (const layer of layers) {
    const layerComps = layer.component_ids
      .map((id) => compMap.get(id))
      .filter(Boolean) as ArchitectureComponent[];
    if (layerComps.length === 0) continue;

    // Compute sizes
    const sizes = layerComps.map((c) => componentSize(c));

    // Lay out in a row within this swim lane
    const rowH = Math.max(...sizes.map((s) => s.h));
    let curX = CANVAS_PAD + LAYER_PAD;
    const startY = curY + LAYER_LABEL_H + LAYER_PAD;

    for (let i = 0; i < layerComps.length; i++) {
      layouts.push({
        id: layerComps[i].id,
        comp: layerComps[i],
        x: curX,
        y: startY,
        w: sizes[i].w,
        h: sizes[i].h,
      });
      curX += sizes[i].w + GRID_GAP_X;
    }

    const laneW = curX - GRID_GAP_X + LAYER_PAD;
    maxW = Math.max(maxW, laneW + CANVAS_PAD);
    curY = startY + rowH + LAYER_PAD;
  }

  // Handle components not in any layer
  const assignedIds = new Set(layers.flatMap((l) => l.component_ids));
  const unassigned = components.filter((c) => !assignedIds.has(c.id));
  if (unassigned.length > 0) {
    const cols = Math.max(2, Math.ceil(Math.sqrt(unassigned.length)));
    let rowX = CANVAS_PAD;
    let rowY = curY + GRID_GAP_Y;
    let colI = 0;
    let rowMaxH = 0;

    for (const c of unassigned) {
      const s = componentSize(c);
      layouts.push({ id: c.id, comp: c, x: rowX, y: rowY, w: s.w, h: s.h });
      rowMaxH = Math.max(rowMaxH, s.h);
      colI++;
      if (colI >= cols) {
        colI = 0;
        rowX = CANVAS_PAD;
        rowY += rowMaxH + GRID_GAP_Y;
        rowMaxH = 0;
      } else {
        rowX += s.w + GRID_GAP_X;
      }
    }
    maxW = Math.max(maxW, rowX + CANVAS_PAD);
    curY = rowY + rowMaxH;
  }

  return { layouts, totalW: maxW + CANVAS_PAD, totalH: curY + CANVAS_PAD };
}

function layoutGrid(
  components: ArchitectureComponent[],
): { layouts: CompLayout[]; totalW: number; totalH: number } {
  const layouts: CompLayout[] = [];
  const cols = Math.max(2, Math.ceil(Math.sqrt(components.length)));
  let rowX = CANVAS_PAD;
  let rowY = CANVAS_PAD;
  let colI = 0;
  let rowMaxH = 0;
  let maxW = 0;

  for (const c of components) {
    const s = componentSize(c);
    layouts.push({ id: c.id, comp: c, x: rowX, y: rowY, w: s.w, h: s.h });
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

// ── Layer swim-lane backgrounds ──────────────────────────────────────────────

function renderLayerBackgrounds(
  layers: ArchitectureLayer[],
  layoutMap: Map<string, CompLayout>,
  totalW: number,
): string[] {
  const parts: string[] = [];
  const layerBounds = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

  for (const layer of layers) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const cid of layer.component_ids) {
      const cl = layoutMap.get(cid);
      if (!cl) continue;
      minX = Math.min(minX, cl.x);
      minY = Math.min(minY, cl.y);
      maxX = Math.max(maxX, cl.x + cl.w);
      maxY = Math.max(maxY, cl.y + cl.h);
    }

    if (minX === Infinity) continue;

    const lx = CANVAS_PAD;
    const ly = minY - LAYER_LABEL_H - LAYER_PAD;
    const lw = totalW - CANVAS_PAD * 2;
    const lh = maxY - ly + LAYER_PAD;

    layerBounds.set(layer.name, { minX: lx, minY: ly, maxX: lx + lw, maxY: ly + lh });

    // Background
    parts.push(
      roundedRect(lx, ly, lw, lh, 6, {
        fill: 'hsl(160 10% 10% / 0.4)',
        stroke: COL_BORDER,
        'stroke-width': 1,
        'stroke-dasharray': '4 2',
      }),
    );

    // Layer label
    parts.push(
      text(lx + 12, ly + 20, layer.name, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE,
        'font-weight': 'bold',
        'font-family': FONT,
        'text-transform': 'uppercase',
        'letter-spacing': '1',
      }),
    );
  }

  return parts;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function render(element: Element): string {
  const data = element.data as ArchitectureDiagramData;
  const components = data.components || [];
  const connections = data.connections || [];
  const layers = data.layers;

  if (components.length === 0) {
    return group([
      text(60, 40, 'No components defined', {
        fill: COL_MUTED,
        'font-size': BODY_SIZE,
        'font-family': FONT,
      }),
    ]);
  }

  // Layout
  const { layouts, totalW, totalH } =
    layers && layers.length > 0
      ? layoutWithLayers(components, layers)
      : layoutGrid(components);

  const layoutMap = new Map(layouts.map((l) => [l.id, l]));

  const parts: string[] = [];

  // Defs: arrow markers
  parts.push(arrowDefs());

  // Layer swim-lane backgrounds
  if (layers && layers.length > 0) {
    parts.push(...renderLayerBackgrounds(layers, layoutMap, totalW));
  }

  // Connections (behind components)
  for (const conn of connections) {
    parts.push(renderConnection(conn, layoutMap));
  }

  // Components
  for (const cl of layouts) {
    parts.push(renderComponent(cl));
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as ArchitectureDiagramData;
  const components = data.components || [];
  const layers = data.layers;

  if (components.length === 0) return { width: 300, height: 100 };

  const { totalW, totalH } =
    layers && layers.length > 0
      ? layoutWithLayers(components, layers)
      : layoutGrid(components);

  return { width: Math.max(300, totalW), height: Math.max(200, totalH) };
}
