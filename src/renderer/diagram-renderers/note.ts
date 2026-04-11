import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { NoteData } from '../../models/elements.js';
import { roundedRect, circle, text, foreignObject, group, escapeHtml } from './svg-builder.js';
import { getNoteColor } from '../theme.js';

const PADDING = 16;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 100;
const CORNER_RADIUS = 8;
const FONT_FAMILY = "'Almarai', 'Inter', sans-serif";

const priorityColors: Record<string, string> = {
  low: 'hsl(152 55% 45%)',
  medium: 'hsl(38 92% 50%)',
  high: 'hsl(0 85% 55%)',
};

export function render(element: Element): string {
  const data = element.data as NoteData;
  const color = getNoteColor(data.color || 'yellow');
  const w = Math.max(element.size?.width || MIN_WIDTH, MIN_WIDTH);
  const h = Math.max(element.size?.height || MIN_HEIGHT, MIN_HEIGHT);

  const parts: string[] = [];

  // Background card
  parts.push(roundedRect(0, 0, w, h, CORNER_RADIUS, {
    fill: color.bg,
    stroke: color.border,
    'stroke-width': 1.5,
  }));

  // Fold effect in top-right corner
  parts.push(
    `<path d="M ${w - 20} 0 L ${w} 20 L ${w - 20} 20 Z" fill="${color.border}" opacity="0.5"/>`
  );

  // Title
  parts.push(text(PADDING, PADDING + 14, element.name, {
    fill: color.text,
    'font-size': 14,
    'font-weight': 'bold',
    'font-family': FONT_FAMILY,
  }));

  // Content via foreignObject for text wrapping
  const contentY = PADDING + 28;
  const contentW = w - PADDING * 2;
  const contentH = h - contentY - PADDING;
  parts.push(foreignObject(
    PADDING,
    contentY,
    contentW,
    contentH,
    `<div style="color:${'hsl(0 0% 95%)'};font-size:12px;font-family:${FONT_FAMILY};line-height:1.5;word-wrap:break-word;overflow:hidden">${escapeHtml(data.content)}</div>`
  ));

  // Priority indicator in top-right corner
  if (data.priority) {
    const priColor = priorityColors[data.priority] || priorityColors.low;
    parts.push(circle(w - 28, 12, 5, {
      fill: priColor,
      stroke: 'none',
    }));
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as NoteData;
  const contentLength = data.content?.length || 0;
  const lines = Math.ceil(contentLength / 35);
  const width = Math.max(MIN_WIDTH, Math.min(300, contentLength * 3));
  const height = Math.max(MIN_HEIGHT, 60 + lines * 18);
  return { width, height };
}
