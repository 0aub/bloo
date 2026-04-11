import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { ImageData } from '../../models/elements.js';
import { roundedRect, rect, text, group, escapeHtml } from './svg-builder.js';

const PADDING = 8;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;
const CORNER_RADIUS = 6;
const CAPTION_HEIGHT = 28;
const FONT_FAMILY = "'Almarai', 'Inter', sans-serif";

export function render(element: Element): string {
  const data = element.data as ImageData;
  const w = Math.max(element.size?.width || MIN_WIDTH, MIN_WIDTH);
  const hasCaption = !!data.caption;
  const captionSpace = hasCaption ? CAPTION_HEIGHT : 0;
  const h = Math.max(element.size?.height || MIN_HEIGHT, MIN_HEIGHT) + captionSpace;

  const bg = 'hsl(160 10% 10%)';
  const border = 'hsl(160 8% 18%)';
  const fg = 'hsl(0 0% 95%)';
  const muted = 'hsl(155 5% 55%)';

  const parts: string[] = [];

  // Outer frame
  parts.push(roundedRect(0, 0, w, h, CORNER_RADIUS, {
    fill: bg,
    stroke: border,
    'stroke-width': 1,
  }));

  const imgX = PADDING;
  const imgY = PADDING;
  const imgW = w - PADDING * 2;
  const imgH = h - PADDING * 2 - captionSpace;

  const isBase64 = data.src && (data.src.startsWith('data:') || data.src.startsWith('base64'));

  if (isBase64) {
    // Render actual image via SVG <image> tag
    parts.push(
      `<image x="${imgX}" y="${imgY}" width="${imgW}" height="${imgH}" href="${escapeHtml(data.src)}" preserveAspectRatio="xMidYMid meet"/>`
    );
  } else {
    // Placeholder rectangle with alt text
    parts.push(rect(imgX, imgY, imgW, imgH, {
      fill: 'hsl(160 8% 13%)',
      rx: 4,
      ry: 4,
    }));

    // Image icon placeholder
    parts.push(text(imgX + imgW / 2, imgY + imgH / 2 - 10, '\uD83D\uDDBC', {
      'font-size': 24,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: muted,
    }));

    // Alt text
    parts.push(text(imgX + imgW / 2, imgY + imgH / 2 + 14, data.alt || 'Image', {
      fill: muted,
      'font-size': 12,
      'font-family': FONT_FAMILY,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    }));

    // Source URL hint
    if (data.src) {
      const srcDisplay = data.src.length > 40 ? data.src.substring(0, 37) + '...' : data.src;
      parts.push(text(imgX + imgW / 2, imgY + imgH / 2 + 32, srcDisplay, {
        fill: muted,
        'font-size': 10,
        'font-family': FONT_FAMILY,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        opacity: 0.6,
      }));
    }
  }

  // Caption
  if (hasCaption) {
    const captionY = h - CAPTION_HEIGHT;
    parts.push(text(w / 2, captionY + CAPTION_HEIGHT / 2 + 1, data.caption!, {
      fill: fg,
      'font-size': 12,
      'font-family': FONT_FAMILY,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-style': 'italic',
    }));
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as ImageData;
  const hasCaption = !!data.caption;
  const width = MIN_WIDTH;
  const height = MIN_HEIGHT + (hasCaption ? CAPTION_HEIGHT : 0);
  return { width, height };
}
