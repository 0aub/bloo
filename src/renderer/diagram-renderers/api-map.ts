import type { Element, Size } from '../../models/board.js';
import type { ApiMapData } from '../../models/elements.js';
import { escapeHtml, roundedRect, rect, text, group, line } from './svg-builder.js';
import { getMethodColor } from '../theme.js';

const FONT = "'Almarai','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";

const PAD = 20;
const GROUP_GAP = 10;
const ENDPOINT_HEIGHT = 26;
const ENDPOINT_GAP = 2;
const GROUP_PAD_X = 16;
const GROUP_PAD_TOP = 28;
const GROUP_PAD_BOTTOM = 12;
const GROUP_WIDTH = 500;
const METHOD_BADGE_W = 56;

export function render(element: Element): string {
  const data = element.data as ApiMapData;
  const { base_url, groups } = data;
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

  // Base URL if present
  let cursorY = PAD + 32;
  if (base_url) {
    parts.push(text(PAD, cursorY + 12, base_url, {
      fill: 'hsl(155 5% 55%)',
      'font-size': 12,
      'font-family': MONO,
    }));
    cursorY += 24;
  }

  cursorY += 8;

  for (const grp of groups) {
    const endpointCount = grp.endpoints.length;
    const groupH = GROUP_PAD_TOP + endpointCount * (ENDPOINT_HEIGHT + ENDPOINT_GAP) + GROUP_PAD_BOTTOM;

    // Group card
    parts.push(roundedRect(PAD, cursorY, GROUP_WIDTH, groupH, 6, {
      fill: 'hsl(160 10% 10% / 0.8)',
      stroke: 'hsl(160 8% 18%)',
      'stroke-width': 1,
    }));

    // Group name
    parts.push(text(PAD + GROUP_PAD_X, cursorY + 20, grp.name, {
      fill: 'hsl(152 65% 55%)',
      'font-size': 13,
      'font-weight': 'bold',
      'font-family': FONT,
    }));

    // Group description
    if (grp.description) {
      parts.push(text(PAD + GROUP_PAD_X, cursorY + 34, grp.description, {
        fill: 'hsl(155 5% 55%)',
        'font-size': 10,
        'font-family': FONT,
      }));
    }

    // Separator line
    parts.push(line(PAD + GROUP_PAD_X, cursorY + GROUP_PAD_TOP - 4, PAD + GROUP_WIDTH - GROUP_PAD_X, cursorY + GROUP_PAD_TOP - 4, {
      stroke: 'hsl(160 8% 18%)',
      'stroke-width': 0.8,
    }));

    // Endpoints
    let ey = cursorY + GROUP_PAD_TOP;
    for (const ep of grp.endpoints) {
      const mc = getMethodColor(ep.method);

      // Method badge
      parts.push(roundedRect(PAD + GROUP_PAD_X, ey, METHOD_BADGE_W, ENDPOINT_HEIGHT - 4, 4, {
        fill: mc.bg,
        stroke: mc.text,
        'stroke-width': 0.8,
      }));
      parts.push(text(PAD + GROUP_PAD_X + METHOD_BADGE_W / 2, ey + ENDPOINT_HEIGHT / 2 + 1, ep.method, {
        fill: mc.text,
        'font-size': 10,
        'font-weight': 'bold',
        'font-family': MONO,
        'text-anchor': 'middle',
      }));

      // Path
      parts.push(text(PAD + GROUP_PAD_X + METHOD_BADGE_W + 10, ey + ENDPOINT_HEIGHT / 2 + 1, ep.path, {
        fill: 'hsl(0 0% 95%)',
        'font-size': 12,
        'font-family': MONO,
      }));

      // Auth lock icon
      if (ep.auth) {
        parts.push(text(PAD + GROUP_WIDTH - GROUP_PAD_X - 30, ey + ENDPOINT_HEIGHT / 2 + 1, '\u{1F512}', {
          fill: 'hsl(38 92% 50%)',
          'font-size': 11,
          'font-family': FONT,
        }));
      }

      // Description (truncated)
      const descX = PAD + GROUP_PAD_X + METHOD_BADGE_W + 10 + Math.min(ep.path.length * 7.5, 200) + 12;
      const availableW = PAD + GROUP_WIDTH - GROUP_PAD_X - (ep.auth ? 40 : 10) - descX;
      if (ep.description && availableW > 40) {
        const maxChars = Math.floor(availableW / 6);
        const descTrunc = ep.description.length > maxChars ? ep.description.slice(0, maxChars - 1) + '\u2026' : ep.description;
        parts.push(text(descX, ey + ENDPOINT_HEIGHT / 2 + 1, descTrunc, {
          fill: 'hsl(155 5% 55%)',
          'font-size': 10,
          'font-family': FONT,
        }));
      }

      ey += ENDPOINT_HEIGHT + ENDPOINT_GAP;
    }

    cursorY += groupH + GROUP_GAP;
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as ApiMapData;
  const { base_url, groups } = data;

  let totalH = PAD + 32;
  if (base_url) totalH += 24;
  totalH += 8;

  for (const grp of groups) {
    totalH += GROUP_PAD_TOP + grp.endpoints.length * (ENDPOINT_HEIGHT + ENDPOINT_GAP) + GROUP_PAD_BOTTOM + GROUP_GAP;
  }
  totalH += PAD;

  return { width: PAD * 2 + GROUP_WIDTH, height: Math.max(totalH, 150) };
}
