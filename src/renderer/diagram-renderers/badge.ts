import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { BadgeData, BadgeItem } from '../../models/elements.js';
import { roundedRect, text, group } from './svg-builder.js';

const FONT_FAMILY = "'Almarai', 'Inter', sans-serif";
const PILL_HEIGHT = 24;
const PILL_RADIUS = 12;
const H_PADDING = 12;
const CHAR_WIDTH = 7;
const BADGE_GAP = 8;
const ROW_GAP = 8;
const MAX_ROW_WIDTH = 500;

const defaultColors: Record<string, { bg: string; text: string }> = {
  green: { bg: 'hsl(152 40% 15%)', text: 'hsl(152 55% 55%)' },
  blue: { bg: 'hsl(210 40% 15%)', text: 'hsl(210 50% 55%)' },
  red: { bg: 'hsl(0 40% 15%)', text: 'hsl(0 60% 55%)' },
  yellow: { bg: 'hsl(38 50% 15%)', text: 'hsl(38 70% 55%)' },
  orange: { bg: 'hsl(25 50% 15%)', text: 'hsl(25 70% 55%)' },
  purple: { bg: 'hsl(280 35% 15%)', text: 'hsl(280 45% 55%)' },
  pink: { bg: 'hsl(340 35% 15%)', text: 'hsl(340 45% 55%)' },
};

function resolveColor(color?: string): { bg: string; text: string } {
  if (!color) return { bg: 'hsl(155 15% 15%)', text: 'hsl(152 65% 55%)' };
  if (defaultColors[color]) return defaultColors[color];
  return { bg: color, text: 'hsl(0 0% 95%)' };
}

function badgeWidth(badge: BadgeItem): number {
  const iconStr = badge.icon ? `${badge.icon} ` : '';
  return (iconStr + badge.label).length * CHAR_WIDTH + H_PADDING * 2;
}

function renderBadge(badge: BadgeItem, x: number, y: number): string {
  const colors = resolveColor(badge.color);
  const iconStr = badge.icon ? `${badge.icon} ` : '';
  const fullLabel = iconStr + badge.label;
  const w = badgeWidth(badge);

  const parts: string[] = [];
  parts.push(roundedRect(x, y, w, PILL_HEIGHT, PILL_RADIUS, {
    fill: colors.bg,
    stroke: colors.text,
    'stroke-width': 1,
    'stroke-opacity': 0.4,
  }));
  parts.push(text(x + w / 2, y + PILL_HEIGHT / 2 + 1, fullLabel, {
    fill: colors.text,
    'font-size': 10,
    'font-weight': 600,
    'font-family': FONT_FAMILY,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
  }));
  return group(parts);
}

export function render(element: Element): string {
  const data = element.data as BadgeData;
  const badges = data.badges;

  const parts: string[] = [];
  let x = 0;
  let y = 0;
  for (const badge of badges) {
    const w = badgeWidth(badge);
    if (x > 0 && x + w > MAX_ROW_WIDTH) {
      x = 0;
      y += PILL_HEIGHT + ROW_GAP;
    }
    parts.push(renderBadge(badge, x, y));
    x += w + BADGE_GAP;
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as BadgeData;
  const badges = data.badges;

  let x = 0;
  let y = 0;
  let maxX = 0;
  for (const badge of badges) {
    const w = badgeWidth(badge);
    if (x > 0 && x + w > MAX_ROW_WIDTH) {
      x = 0;
      y += PILL_HEIGHT + ROW_GAP;
    }
    x += w + BADGE_GAP;
    maxX = Math.max(maxX, x - BADGE_GAP);
  }
  return { width: maxX, height: y + PILL_HEIGHT };
}
