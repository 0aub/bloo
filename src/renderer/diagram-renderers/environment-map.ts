import type { Element, Size } from '../../models/board.js';
import type { EnvironmentMapData } from '../../models/elements.js';
import { escapeHtml, roundedRect, rect, text, group, path, defs, marker, cylinder, line } from './svg-builder.js';

const FONT = "'Almarai','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";

const PAD = 24;
const MIN_ENV_WIDTH = 200;
const ENV_GAP = 60;
const SERVICE_HEIGHT = 22;
const SERVICE_GAP = 4;
const ENV_PAD_X = 14;
const ENV_PAD_TOP = 48;
const ENV_PAD_BOTTOM = 14;
const DB_HEIGHT = 36;
const MIN_DB_WIDTH = 90;

const envTierColors: Record<string, { fill: string; border: string; glow: string }> = {
  dev: { fill: 'hsl(210 40% 12%)', border: 'hsl(210 50% 45%)', glow: 'hsl(210 50% 45% / 0.12)' },
  development: { fill: 'hsl(210 40% 12%)', border: 'hsl(210 50% 45%)', glow: 'hsl(210 50% 45% / 0.12)' },
  staging: { fill: 'hsl(35 45% 12%)', border: 'hsl(35 70% 50%)', glow: 'hsl(35 70% 50% / 0.12)' },
  qa: { fill: 'hsl(280 30% 12%)', border: 'hsl(280 45% 50%)', glow: 'hsl(280 45% 50% / 0.12)' },
  prod: { fill: 'hsl(152 40% 12%)', border: 'hsl(152 55% 45%)', glow: 'hsl(152 55% 45% / 0.12)' },
  production: { fill: 'hsl(152 40% 12%)', border: 'hsl(152 55% 45%)', glow: 'hsl(152 55% 45% / 0.12)' },
};

function getEnvTierColor(name: string): { fill: string; border: string; glow: string } {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(envTierColors)) {
    if (key.includes(k)) return v;
  }
  return { fill: 'hsl(155 5% 12%)', border: 'hsl(155 5% 35%)', glow: 'none' };
}

function envCardHeight(serviceCount: number, hasDb: boolean, hasNotes: boolean): number {
  let h = ENV_PAD_TOP;
  h += serviceCount * (SERVICE_HEIGHT + SERVICE_GAP);
  if (hasDb) h += DB_HEIGHT + 16;
  if (hasNotes) h += 24;
  h += ENV_PAD_BOTTOM;
  return h;
}

export function render(element: Element): string {
  const data = element.data as EnvironmentMapData;
  const environments = data.environments || [];
  const promotions = data.promotions || [];
  const size = calculateSize(element);

  const parts: string[] = [];

  // Arrow marker
  parts.push(defs(
    marker('env-arrow', 6, 4, 8, 8,
      path('M 0 0 L 8 4 L 0 8 Z', { fill: 'hsl(152 65% 55%)' })
    )
  ));

  // Background
  parts.push(roundedRect(0, 0, size.width, size.height, 8, {
    fill: 'hsl(160 10% 10%)',
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

  const flowTop = PAD + 40;

  // Compute max card height for alignment
  const maxH = environments.length > 0
    ? Math.max(...environments.map(e => envCardHeight((e.services || []).length, !!e.database, !!e.notes)))
    : 100;
  const centerY = flowTop + maxH / 2;

  // Track positions for promotions
  const envPositions: Map<string, { x: number; centerY: number; width: number }> = new Map();

  // Compute per-environment widths based on content
  const CHAR_W = 6.5;
  const envWidthMap = new Map<string, number>();
  for (const env of environments) {
    const nameW = (env.name || '').length * (CHAR_W + 1) + ENV_PAD_X * 2;
    const svcWs = (env.services || []).map(s => (s.name || '').length * CHAR_W + ENV_PAD_X * 2 + 16 + (s.replicas ? 30 : 0));
    const dbW = env.database ? env.database.length * CHAR_W + 30 : 0;
    const urlW = env.url ? env.url.length * 5.5 + ENV_PAD_X * 2 : 0;
    const infraW = env.infrastructure ? env.infrastructure.length * 5.5 + ENV_PAD_X * 2 : 0;
    envWidthMap.set(env.id, Math.max(MIN_ENV_WIDTH, nameW, Math.max(0, ...svcWs), dbW, urlW, infraW));
  }

  let envX = PAD;
  for (const env of environments) {
    const tc = getEnvTierColor(env.name);
    const cardH = envCardHeight((env.services || []).length, !!env.database, !!env.notes);
    const cardY = centerY - cardH / 2;
    const EW = envWidthMap.get(env.id) || MIN_ENV_WIDTH;

    envPositions.set(env.id, { x: envX, centerY, width: EW });

    // Environment card
    parts.push(roundedRect(envX, cardY, EW, cardH, 6, {
      fill: tc.fill,
      stroke: tc.border,
      'stroke-width': 1.2,
    }));

    // Glow
    if (tc.glow !== 'none') {
      parts.push(roundedRect(envX - 1, cardY - 1, EW + 2, cardH + 2, 7, {
        fill: 'none',
        stroke: tc.glow,
        'stroke-width': 3,
        opacity: 0.4,
      }));
    }

    // Env name
    parts.push(text(envX + ENV_PAD_X, cardY + 22, env.name, {
      fill: 'hsl(0 0% 95%)',
      'font-size': 13,
      'font-weight': 'bold',
      'font-family': FONT,
    }));

    // URL
    if (env.url) {
      parts.push(text(envX + ENV_PAD_X, cardY + 36, env.url, {
        fill: 'hsl(155 5% 55%)',
        'font-size': 9,
        'font-family': MONO,
      }));
    }

    // Infrastructure
    if (env.infrastructure) {
      parts.push(text(envX + EW - ENV_PAD_X, cardY + 22, env.infrastructure, {
        fill: 'hsl(155 5% 55%)',
        'font-size': 9,
        'font-family': MONO,
        'text-anchor': 'end',
      }));
    }

    // Separator
    parts.push(line(envX + ENV_PAD_X, cardY + ENV_PAD_TOP - 6, envX + EW - ENV_PAD_X, cardY + ENV_PAD_TOP - 6, {
      stroke: tc.border,
      'stroke-width': 0.5,
      'stroke-opacity': 0.5,
    }));

    // Services
    let sy = cardY + ENV_PAD_TOP;
    for (const svc of env.services || []) {
      parts.push(roundedRect(envX + ENV_PAD_X, sy, EW - ENV_PAD_X * 2, SERVICE_HEIGHT, 3, {
        fill: 'hsl(160 10% 10%)',
        stroke: 'hsl(160 8% 18%)',
        'stroke-width': 0.6,
      }));
      parts.push(text(envX + ENV_PAD_X + 8, sy + 15, svc.name, {
        fill: 'hsl(0 0% 95%)',
        'font-size': 10,
        'font-family': MONO,
      }));
      if (svc.replicas && svc.replicas > 1) {
        parts.push(text(envX + EW - ENV_PAD_X - 8, sy + 15, `x${svc.replicas}`, {
          fill: 'hsl(152 65% 55%)',
          'font-size': 9,
          'font-family': MONO,
          'text-anchor': 'end',
        }));
      }
      sy += SERVICE_HEIGHT + SERVICE_GAP;
    }

    // Database cylinder
    if (env.database) {
      sy += 8;
      const dbW = Math.max(MIN_DB_WIDTH, env.database.length * CHAR_W + 20);
      const dbX = envX + EW / 2 - dbW / 2;
      parts.push(cylinder(dbX, sy, dbW, DB_HEIGHT, 'hsl(152 40% 15%)', 'hsl(152 55% 45%)'));
      parts.push(text(envX + EW / 2, sy + DB_HEIGHT / 2 + 14, env.database, {
        fill: 'hsl(152 55% 65%)',
        'font-size': 9,
        'font-family': MONO,
        'text-anchor': 'middle',
      }));
      sy += DB_HEIGHT + 8;
    }

    // Notes
    if (env.notes) {
      sy += 4;
      const notesTrunc = env.notes.length > 28 ? env.notes.slice(0, 27) + '\u2026' : env.notes;
      parts.push(text(envX + ENV_PAD_X, sy + 10, notesTrunc, {
        fill: 'hsl(155 5% 55%)',
        'font-size': 9,
        'font-family': FONT,
        'font-style': 'italic',
      }));
    }

    envX += EW + ENV_GAP;
  }

  // Promotion arrows
  for (const promo of promotions) {
    const fromPos = envPositions.get(promo.from);
    const toPos = envPositions.get(promo.to);
    if (!fromPos || !toPos) continue;

    const x1 = fromPos.x + fromPos.width + 8;
    const x2 = toPos.x - 8;
    const y = centerY;

    // Arrow line
    parts.push(path(
      `M ${x1} ${y} L ${x2} ${y}`,
      {
        fill: 'none',
        stroke: 'hsl(152 65% 55%)',
        'stroke-width': 1.5,
        'marker-end': 'url(#env-arrow)',
      }
    ));

    // Method label
    parts.push(text((x1 + x2) / 2, y - 8, promo.method, {
      fill: 'hsl(155 5% 55%)',
      'font-size': 9,
      'font-family': MONO,
      'text-anchor': 'middle',
    }));
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as EnvironmentMapData;
  const environments = data.environments || [];

  const maxH = environments.length > 0
    ? Math.max(...environments.map(e => envCardHeight((e.services || []).length, !!e.database, !!e.notes)))
    : 100;

  const CW = 6.5;
  const envWs = environments.map(env => {
    const nameW = (env.name || '').length * (CW + 1) + ENV_PAD_X * 2;
    const svcWs = (env.services || []).map(s => (s.name || '').length * CW + ENV_PAD_X * 2 + 16);
    const dbW = env.database ? env.database.length * CW + 30 : 0;
    return Math.max(MIN_ENV_WIDTH, nameW, Math.max(0, ...svcWs), dbW);
  });
  const width = PAD * 2 + envWs.reduce((s, w) => s + w, 0) + Math.max(0, environments.length - 1) * ENV_GAP;
  const height = PAD + 40 + maxH + PAD;

  return { width: Math.max(width, 300), height: Math.max(height, 150) };
}
