import type { Element, Size } from '../../models/board.js';
import type { PermissionMatrixData } from '../../models/elements.js';
import { escapeHtml, roundedRect, rect, text, group } from './svg-builder.js';

const FONT = "'Almarai','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";

const COL_WIDTH = 150;
const ROW_HEIGHT = 42;
const HEADER_HEIGHT = 44;
const RESOURCE_COL_WIDTH = 180;
const PAD = 20;

const actionColors: Record<string, { bg: string; text: string }> = {
  read: { bg: 'hsl(152 40% 15%)', text: 'hsl(152 55% 55%)' },
  write: { bg: 'hsl(210 40% 15%)', text: 'hsl(210 50% 55%)' },
  delete: { bg: 'hsl(0 40% 15%)', text: 'hsl(0 60% 55%)' },
  create: { bg: 'hsl(280 35% 15%)', text: 'hsl(280 45% 55%)' },
  update: { bg: 'hsl(35 45% 15%)', text: 'hsl(35 70% 55%)' },
  execute: { bg: 'hsl(180 35% 15%)', text: 'hsl(180 45% 55%)' },
};

function getActionColor(action: string): { bg: string; text: string } {
  return actionColors[action.toLowerCase()] || { bg: 'hsl(155 5% 15%)', text: 'hsl(155 5% 55%)' };
}

export function render(element: Element): string {
  const data = element.data as PermissionMatrixData;
  const { roles, resources } = data;
  const size = calculateSize(element);

  const parts: string[] = [];

  // Background
  parts.push(roundedRect(0, 0, size.width, size.height, 8, {
    fill: 'hsl(160 15% 7%)',
    stroke: 'hsl(160 8% 18%)',
    'stroke-width': 1.5,
  }));

  // Title
  parts.push(text(PAD, PAD + 14, element.name, {
    fill: 'hsl(0 0% 95%)',
    'font-size': 14,
    'font-weight': 'bold',
    'font-family': FONT,
  }));

  const tableTop = PAD + 32;

  // Column headers (roles)
  for (let c = 0; c < roles.length; c++) {
    const x = PAD + RESOURCE_COL_WIDTH + c * COL_WIDTH;
    parts.push(roundedRect(x, tableTop, COL_WIDTH - 4, HEADER_HEIGHT, 4, {
      fill: 'hsl(160 10% 10%)',
      stroke: 'hsl(160 8% 18%)',
      'stroke-width': 1,
    }));
    parts.push(text(x + COL_WIDTH / 2 - 2, tableTop + HEADER_HEIGHT / 2 + 4, roles[c], {
      fill: 'hsl(152 65% 55%)',
      'font-size': 12,
      'font-weight': 'bold',
      'font-family': FONT,
      'text-anchor': 'middle',
    }));
  }

  // Resource column header
  parts.push(roundedRect(PAD, tableTop, RESOURCE_COL_WIDTH - 4, HEADER_HEIGHT, 4, {
    fill: 'hsl(160 10% 10%)',
    stroke: 'hsl(160 8% 18%)',
    'stroke-width': 1,
  }));
  parts.push(text(PAD + 12, tableTop + HEADER_HEIGHT / 2 + 4, 'Resource', {
    fill: 'hsl(155 5% 55%)',
    'font-size': 12,
    'font-weight': 'bold',
    'font-family': FONT,
  }));

  // Rows
  const rowStart = tableTop + HEADER_HEIGHT + 4;
  for (let r = 0; r < resources.length; r++) {
    const resource = resources[r];
    const y = rowStart + r * ROW_HEIGHT;

    // Alternating row bg
    if (r % 2 === 0) {
      parts.push(roundedRect(PAD, y, RESOURCE_COL_WIDTH + roles.length * COL_WIDTH - 4, ROW_HEIGHT - 2, 4, {
        fill: 'hsl(160 10% 10% / 0.4)',
      }));
    }

    // Resource name
    parts.push(text(PAD + 12, y + ROW_HEIGHT / 2 + 4, resource.name, {
      fill: 'hsl(0 0% 95%)',
      'font-size': 12,
      'font-family': MONO,
    }));

    // Permission cells
    for (let c = 0; c < roles.length; c++) {
      const role = roles[c];
      const perms = resource.permissions[role] || [];
      const cellX = PAD + RESOURCE_COL_WIDTH + c * COL_WIDTH;

      // Render permission badges
      const badges: string[] = [];
      let bx = cellX + 6;
      for (const perm of perms) {
        const color = getActionColor(perm);
        const badgeW = perm.length * 6.5 + 10;
        badges.push(roundedRect(bx, y + 6, badgeW, 22, 4, {
          fill: color.bg,
          stroke: color.text,
          'stroke-width': 0.8,
        }));
        badges.push(text(bx + badgeW / 2, y + 20, perm, {
          fill: color.text,
          'font-size': 10,
          'font-family': MONO,
          'text-anchor': 'middle',
        }));
        bx += badgeW + 4;
      }
      parts.push(group(badges));
    }
  }

  // Grid lines
  for (let c = 0; c <= roles.length; c++) {
    const x = PAD + RESOURCE_COL_WIDTH + c * COL_WIDTH - 2;
    parts.push(`<line x1="${x}" y1="${tableTop}" x2="${x}" y2="${rowStart + resources.length * ROW_HEIGHT}" stroke="hsl(160 8% 18%)" stroke-width="0.5" stroke-opacity="0.5"/>`);
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as PermissionMatrixData;
  const { roles, resources } = data;

  const width = PAD * 2 + RESOURCE_COL_WIDTH + roles.length * COL_WIDTH;
  const height = PAD + 32 + HEADER_HEIGHT + 4 + resources.length * ROW_HEIGHT + PAD;

  return { width: Math.max(width, 300), height: Math.max(height, 150) };
}
