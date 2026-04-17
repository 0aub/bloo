import type { Element, Size } from '../../models/board.js';
import type { PageMapData } from '../../models/elements.js';
import { escapeHtml, roundedRect, rect, text, group, path, defs, marker, line } from './svg-builder.js';

const FONT = "'Almarai','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";

const PAD = 24;
const PAGE_WIDTH = 180;
const PAGE_HEIGHT = 100;
const TITLE_BAR_H = 28;
const COLS = 4;
const H_GAP = 100;
const V_GAP = 100;

const pageTypeColors: Record<string, { fill: string; titleBg: string; border: string }> = {
  page: { fill: 'hsl(200 35% 18%)', titleBg: 'hsl(200 40% 24%)', border: 'hsl(200 50% 45%)' },
  modal: { fill: 'hsl(280 25% 18%)', titleBg: 'hsl(280 30% 24%)', border: 'hsl(280 40% 50%)' },
  drawer: { fill: 'hsl(35 35% 18%)', titleBg: 'hsl(35 40% 24%)', border: 'hsl(35 55% 50%)' },
  tab: { fill: 'hsl(180 25% 18%)', titleBg: 'hsl(180 30% 24%)', border: 'hsl(180 40% 48%)' },
};

function getPageColor(type?: string): { fill: string; titleBg: string; border: string } {
  return pageTypeColors[type || 'page'] || pageTypeColors.page;
}

function getPagePosition(index: number): { x: number; y: number } {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: PAD + col * (PAGE_WIDTH + H_GAP),
    y: PAD + 36 + row * (PAGE_HEIGHT + V_GAP),
  };
}

function getPageCenter(index: number): { cx: number; cy: number } {
  const { x, y } = getPagePosition(index);
  return { cx: x + PAGE_WIDTH / 2, cy: y + PAGE_HEIGHT / 2 };
}

export function render(element: Element): string {
  const data = element.data as PageMapData;
  const pages = data.pages || [];
  const navigations = data.navigations || [];
  const size = calculateSize(element);

  const parts: string[] = [];

  // Arrow markers
  parts.push(defs([
    marker('page-arrow', 6, 4, 8, 8,
      path('M 0 0 L 8 4 L 0 8 Z', { fill: 'hsl(152 65% 55%)' })
    ),
    marker('page-arrow-dashed', 6, 4, 8, 8,
      path('M 0 0 L 8 4 L 0 8 Z', { fill: 'hsl(38 92% 50%)' })
    ),
  ].join('')));

  // Background
  parts.push(roundedRect(0, 0, size.width, size.height, 8, {
    fill: 'hsl(160 10% 10%)',
    stroke: 'hsl(160 10% 30%)',
    'stroke-width': 1.5,
  }));

  // Title
  parts.push(text(PAD, PAD + 14, element.name, {
    fill: 'hsl(0 0% 95%)',
    'font-size': 14,
    'font-weight': 'bold',
    'font-family': FONT,
  }));

  // Build page index for lookups
  const pageIndex: Map<string, number> = new Map();
  pages.forEach((p, i) => pageIndex.set(p.id, i));

  // Draw navigation arrows (behind pages)
  for (const nav of navigations) {
    const fromIdx = pageIndex.get(nav.from);
    const toIdx = pageIndex.get(nav.to);
    if (fromIdx === undefined || toIdx === undefined) continue;

    const from = getPageCenter(fromIdx);
    const to = getPageCenter(toIdx);

    const isConditional = !!nav.condition;

    // Compute direction and offset start/end to page edges
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue;

    const nx = dx / dist;
    const ny = dy / dist;

    // Start from edge of source page
    const startX = from.cx + nx * (PAGE_WIDTH / 2 + 4);
    const startY = from.cy + ny * (PAGE_HEIGHT / 2 + 4);
    const endX = to.cx - nx * (PAGE_WIDTH / 2 + 12);
    const endY = to.cy - ny * (PAGE_HEIGHT / 2 + 12);

    // Curved path
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const perpX = -ny * 20;
    const perpY = nx * 20;

    parts.push(path(
      `M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY}, ${endX} ${endY}`,
      {
        fill: 'none',
        stroke: isConditional ? 'hsl(38 92% 50%)' : 'hsl(152 65% 55%)',
        'stroke-width': 1.2,
        'stroke-dasharray': isConditional ? '6,3' : undefined,
        'marker-end': isConditional ? 'url(#page-arrow-dashed)' : 'url(#page-arrow)',
        'stroke-opacity': 0.7,
      }
    ));

    // Trigger label on arrow
    parts.push(text(midX + perpX / 2, midY + perpY / 2 - 4, nav.trigger, {
      fill: isConditional ? 'hsl(38 80% 60%)' : 'hsl(155 5% 55%)',
      'font-size': 9,
      'font-family': FONT,
      'text-anchor': 'middle',
    }));

    // Condition label
    if (nav.condition) {
      parts.push(text(midX + perpX / 2, midY + perpY / 2 + 8, nav.condition, {
        fill: 'hsl(38 70% 50%)',
        'font-size': 8,
        'font-family': MONO,
        'text-anchor': 'middle',
        'font-style': 'italic',
      }));
    }
  }

  // Draw page cards
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    const { x, y } = getPagePosition(i);
    const pc = getPageColor(pg.type);

    // Screen-shaped rectangle: card body
    parts.push(roundedRect(x, y, PAGE_WIDTH, PAGE_HEIGHT, 6, {
      fill: pc.fill,
      stroke: pc.border,
      'stroke-width': 1.2,
    }));

    // Title bar
    // Clip to top with a rect + rounded top corners via path
    parts.push(path(
      `M ${x + 6} ${y} L ${x + PAGE_WIDTH - 6} ${y} Q ${x + PAGE_WIDTH} ${y}, ${x + PAGE_WIDTH} ${y + 6} L ${x + PAGE_WIDTH} ${y + TITLE_BAR_H} L ${x} ${y + TITLE_BAR_H} L ${x} ${y + 6} Q ${x} ${y}, ${x + 6} ${y} Z`,
      {
        fill: pc.titleBg,
      }
    ));

    // Window dots (decorative)
    const dotY = y + 9;
    parts.push(`<circle cx="${x + 12}" cy="${dotY}" r="3" fill="hsl(0 60% 50%)" opacity="0.6"/>`);
    parts.push(`<circle cx="${x + 22}" cy="${dotY}" r="3" fill="hsl(38 80% 50%)" opacity="0.6"/>`);
    parts.push(`<circle cx="${x + 32}" cy="${dotY}" r="3" fill="hsl(130 50% 45%)" opacity="0.6"/>`);

    // Page name
    parts.push(text(x + 42, y + 13, pg.name, {
      fill: 'hsl(0 0% 95%)',
      'font-size': 11,
      'font-weight': 'bold',
      'font-family': FONT,
    }));

    // Separator
    parts.push(line(x, y + TITLE_BAR_H, x + PAGE_WIDTH, y + TITLE_BAR_H, {
      stroke: pc.border,
      'stroke-width': 1,
    }));

    // Route
    parts.push(text(x + 8, y + TITLE_BAR_H + 16, pg.route, {
      fill: 'hsl(152 65% 55%)',
      'font-size': 10,
      'font-family': MONO,
    }));

    // Auth badge
    if (pg.auth_required) {
      const badgeX = x + PAGE_WIDTH - 42;
      const badgeY = y + TITLE_BAR_H + 6;
      parts.push(roundedRect(badgeX, badgeY, 34, 16, 3, {
        fill: 'hsl(38 50% 15%)',
        stroke: 'hsl(38 70% 50%)',
        'stroke-width': 1,
      }));
      parts.push(text(badgeX + 17, badgeY + 11, '\u{1F512} auth', {
        fill: 'hsl(38 70% 60%)',
        'font-size': 8,
        'font-family': MONO,
        'text-anchor': 'middle',
      }));
    }

    // Description
    if (pg.description) {
      const maxChars = Math.floor((PAGE_WIDTH - 16) / 6);
      const desc = pg.description.length > maxChars ? pg.description.slice(0, maxChars - 1) + '\u2026' : pg.description;
      parts.push(text(x + 8, y + TITLE_BAR_H + 34, desc, {
        fill: 'hsl(155 5% 55%)',
        'font-size': 9,
        'font-family': FONT,
      }));
    }

    // Roles
    if (pg.roles && pg.roles.length > 0) {
      const rolesStr = pg.roles.join(', ');
      const maxChars = Math.floor((PAGE_WIDTH - 16) / 5.5);
      const rolesTrunc = rolesStr.length > maxChars ? rolesStr.slice(0, maxChars - 1) + '\u2026' : rolesStr;
      parts.push(text(x + 8, y + PAGE_HEIGHT - 8, rolesTrunc, {
        fill: 'hsl(280 40% 60%)',
        'font-size': 8,
        'font-family': MONO,
      }));
    }

    // Type badge (if not plain "page")
    if (pg.type && pg.type !== 'page') {
      parts.push(roundedRect(x + PAGE_WIDTH - 44, y + PAGE_HEIGHT - 20, 38, 14, 3, {
        fill: pc.titleBg,
        stroke: pc.border,
        'stroke-width': 1,
      }));
      parts.push(text(x + PAGE_WIDTH - 25, y + PAGE_HEIGHT - 10, pg.type, {
        fill: pc.border,
        'font-size': 8,
        'font-family': MONO,
        'text-anchor': 'middle',
      }));
    }
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as PageMapData;
  const pages = data.pages || [];

  const count = pages.length || 1;
  const cols = Math.min(count, COLS);
  const rows = Math.ceil(count / COLS);

  const width = PAD * 2 + cols * PAGE_WIDTH + (cols - 1) * H_GAP;
  const height = PAD + 36 + rows * PAGE_HEIGHT + (rows - 1) * V_GAP + PAD;

  return { width: Math.max(width, 300), height: Math.max(height, 200) };
}
