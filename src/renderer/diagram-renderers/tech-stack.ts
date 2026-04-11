import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { TechStackData } from '../../models/elements.js';
import { roundedRect, text, group, escapeHtml } from './svg-builder.js';
import { getCategoryColor } from '../theme.js';

const FONT_FAMILY = "'Almarai', 'Inter', sans-serif";
const MONO_FONT = "'JetBrains Mono', monospace";
const COL_WIDTH = 250;
const COL_GAP = 16;
const PADDING = 16;
const HEADER_HEIGHT = 36;
const TECH_CARD_HEIGHT = 60;
const TECH_GAP = 8;
const CORNER_RADIUS = 8;
const CARD_RADIUS = 6;

export function render(element: Element): string {
  const data = element.data as TechStackData;
  const categories = data.categories || [];

  const bg = 'hsl(160 10% 10%)';
  const border = 'hsl(160 8% 18%)';
  const fg = 'hsl(0 0% 95%)';
  const muted = 'hsl(155 5% 55%)';
  const accent = 'hsl(152 65% 55%)';

  const size = calculateSize(element);
  const parts: string[] = [];

  // Outer container
  parts.push(roundedRect(0, 0, size.width, size.height, CORNER_RADIUS, {
    fill: bg,
    stroke: border,
    'stroke-width': 1,
  }));

  // Title
  parts.push(text(PADDING, PADDING + 14, element.name, {
    fill: fg,
    'font-size': 14,
    'font-weight': 'bold',
    'font-family': FONT_FAMILY,
  }));

  const startY = PADDING + 30;

  categories.forEach((cat, catIdx) => {
    const colX = PADDING + catIdx * (COL_WIDTH + COL_GAP);
    let y = startY;

    // Category header
    parts.push(roundedRect(colX, y, COL_WIDTH, HEADER_HEIGHT, CARD_RADIUS, {
      fill: accent,
      opacity: 0.15,
    }));
    parts.push(roundedRect(colX, y, COL_WIDTH, HEADER_HEIGHT, CARD_RADIUS, {
      fill: 'none',
      stroke: accent,
      'stroke-width': 1,
      'stroke-opacity': 0.3,
    }));
    parts.push(text(colX + COL_WIDTH / 2, y + HEADER_HEIGHT / 2 + 1, cat.name, {
      fill: accent,
      'font-size': 12,
      'font-weight': 'bold',
      'font-family': FONT_FAMILY,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    }));

    y += HEADER_HEIGHT + TECH_GAP;

    // Technology cards
    (cat.technologies || []).forEach((tech) => {
      // Card background
      parts.push(roundedRect(colX, y, COL_WIDTH, TECH_CARD_HEIGHT, CARD_RADIUS, {
        fill: 'hsl(160 8% 13%)',
        stroke: border,
        'stroke-width': 1,
      }));

      // Tech name
      const nameStr = tech.version ? `${tech.name} v${tech.version}` : tech.name;
      parts.push(text(colX + 10, y + 18, nameStr, {
        fill: fg,
        'font-size': 12,
        'font-weight': 600,
        'font-family': MONO_FONT,
      }));

      // Purpose
      const purposeMaxLen = 30;
      const purposeDisplay = tech.purpose.length > purposeMaxLen
        ? tech.purpose.substring(0, purposeMaxLen - 3) + '...'
        : tech.purpose;
      parts.push(text(colX + 10, y + 38, purposeDisplay, {
        fill: muted,
        'font-size': 10,
        'font-family': FONT_FAMILY,
      }));

      y += TECH_CARD_HEIGHT + TECH_GAP;
    });
  });

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as TechStackData;
  const categories = data.categories || [];
  const numCols = categories.length || 1;

  const width = PADDING * 2 + numCols * COL_WIDTH + Math.max(0, numCols - 1) * COL_GAP;

  const maxTechs = categories.reduce((max, cat) => Math.max(max, (cat.technologies || []).length), 0);
  const columnHeight = HEADER_HEIGHT + TECH_GAP + maxTechs * (TECH_CARD_HEIGHT + TECH_GAP);
  const height = PADDING + 30 + columnHeight + PADDING;

  return { width, height };
}
