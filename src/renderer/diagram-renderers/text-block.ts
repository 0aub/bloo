import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { TextBlockData } from '../../models/elements.js';
import { roundedRect, text, foreignObject, group, escapeHtml } from './svg-builder.js';

const PADDING = 16;
const MIN_WIDTH = 220;
const MIN_HEIGHT = 80;
const CORNER_RADIUS = 6;
const FONT_FAMILY = "'Almarai', 'Inter', sans-serif";

export function render(element: Element): string {
  const data = element.data as TextBlockData;
  const w = Math.max(element.size?.width || MIN_WIDTH, MIN_WIDTH);
  const h = Math.max(element.size?.height || MIN_HEIGHT, MIN_HEIGHT);

  const bg = 'hsl(160 10% 10%)';
  const border = 'hsl(160 8% 18%)';
  const fg = 'hsl(0 0% 95%)';
  const muted = 'hsl(155 5% 55%)';

  const parts: string[] = [];

  // Card background
  parts.push(roundedRect(0, 0, w, h, CORNER_RADIUS, {
    fill: bg,
    stroke: border,
    'stroke-width': 1,
  }));

  // Title bar
  parts.push(text(PADDING, PADDING + 14, element.name, {
    fill: fg,
    'font-size': 14,
    'font-weight': 'bold',
    'font-family': FONT_FAMILY,
  }));

  // Separator line
  const sepY = PADDING + 24;
  parts.push(`<line x1="${PADDING}" y1="${sepY}" x2="${w - PADDING}" y2="${sepY}" stroke="${border}" stroke-width="1"/>`);

  // Content area with foreignObject for text wrapping
  const contentY = sepY + 8;
  const contentW = w - PADDING * 2;
  const contentH = h - contentY - PADDING;
  parts.push(foreignObject(
    PADDING,
    contentY,
    contentW,
    contentH,
    `<div style="color:${muted};font-size:12px;font-family:${FONT_FAMILY};line-height:1.6;word-wrap:break-word;overflow:hidden;white-space:pre-wrap">${escapeHtml(data.content)}</div>`
  ));

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as TextBlockData;
  const contentLength = data.content?.length || 0;
  const lines = Math.ceil(contentLength / 40);
  const width = Math.max(MIN_WIDTH, Math.min(400, contentLength * 2.5));
  const height = Math.max(MIN_HEIGHT, 60 + lines * 20);
  return { width, height };
}
