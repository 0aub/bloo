import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { BadgeData } from '../../models/elements.js';
import { roundedRect, text, group, escapeHtml } from './svg-builder.js';

const FONT_FAMILY = "'Almarai', 'Inter', sans-serif";
const PILL_HEIGHT = 24;
const PILL_RADIUS = 12;
const H_PADDING = 12;
const CHAR_WIDTH = 7;

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
  // Treat as raw CSS color
  return { bg: color, text: 'hsl(0 0% 95%)' };
}

interface BadgeItem {
  label: string;
  color?: string;
  icon?: string;
}

function getBadge(data: BadgeData): BadgeItem {
  return { label: data.label || '', color: data.color, icon: data.icon };
}

function badgeWidth(badge: BadgeItem): number {
  const iconStr = badge.icon ? `${badge.icon} ` : '';
  const fullLabel = iconStr + (badge.label || '');
  return fullLabel.length * CHAR_WIDTH + H_PADDING * 2;
}

function renderSingleBadge(badge: BadgeItem, x: number, y: number): string {
  const colors = resolveColor(badge.color);
  const iconStr = badge.icon ? `${badge.icon} ` : '';
  const fullLabel = iconStr + (badge.label || '');
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
  const badge = getBadge(data);
  return renderSingleBadge(badge, 0, 0);
}

export function calculateSize(element: Element): Size {
  const data = element.data as BadgeData;
  const badge = getBadge(data);
  return { width: badgeWidth(badge), height: PILL_HEIGHT };
}
