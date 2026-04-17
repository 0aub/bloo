import type { Element, Size } from '../../models/board.js';
import type { SecurityLayerMapData } from '../../models/elements.js';
import { escapeHtml, roundedRect, text, group, path, defs, marker } from './svg-builder.js';

const FONT = "'Almarai','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";

const PAD = 24;
const LAYER_MARGIN = 32;
const MIN_INNER_SIZE = 100;
const LABEL_HEIGHT = 20;

// Color gradient: level 0 (outermost) = red/amber, higher levels = towards green
const layerPalette: Array<{ fill: string; border: string; text: string }> = [
  { fill: 'hsl(0 40% 12%)', border: 'hsl(0 60% 50%)', text: 'hsl(0 60% 65%)' },
  { fill: 'hsl(20 45% 12%)', border: 'hsl(20 70% 50%)', text: 'hsl(20 65% 65%)' },
  { fill: 'hsl(38 45% 12%)', border: 'hsl(38 75% 50%)', text: 'hsl(38 70% 65%)' },
  { fill: 'hsl(65 40% 12%)', border: 'hsl(65 60% 45%)', text: 'hsl(65 55% 60%)' },
  { fill: 'hsl(100 35% 12%)', border: 'hsl(100 50% 42%)', text: 'hsl(100 45% 58%)' },
  { fill: 'hsl(130 35% 12%)', border: 'hsl(130 50% 42%)', text: 'hsl(130 45% 58%)' },
  { fill: 'hsl(152 40% 12%)', border: 'hsl(152 55% 45%)', text: 'hsl(152 50% 60%)' },
];

function getLayerColor(level: number, maxLevel: number): { fill: string; border: string; text: string } {
  if (maxLevel <= 0) return layerPalette[0];
  const idx = Math.round((level / maxLevel) * (layerPalette.length - 1));
  return layerPalette[Math.min(idx, layerPalette.length - 1)];
}

export function render(element: Element): string {
  const data = element.data as SecurityLayerMapData;
  const rawLayers = data.layers || [];
  const flows = data.flows || [];
  const size = calculateSize(element);

  // Normalize layers: assign level/id if missing
  const layers = rawLayers.map((l: any, i: number) => ({
    ...l,
    id: l.id || `layer_${i}`,
    level: l.level ?? i,
  }));

  const parts: string[] = [];

  // Arrow marker
  parts.push(defs(
    marker('sec-flow-arrow', 6, 4, 8, 8,
      path('M 0 0 L 8 4 L 0 8 Z', { fill: 'hsl(0 0% 95%)' })
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

  const diagramTop = PAD + 36;

  // Sort layers by level ascending (0 = outermost)
  const sorted = [...layers].sort((a: any, b: any) => a.level - b.level);
  const maxLevel = sorted.length > 0 ? sorted[sorted.length - 1].level : 0;

  // Center point
  const centerX = size.width / 2;
  const availableW = size.width - PAD * 2;
  const availableH = size.height - diagramTop - PAD;
  const centerY = diagramTop + availableH / 2;

  // Map layer id -> concentric rect coords for flow arrows
  const layerBounds: Map<string, { x: number; y: number; w: number; h: number; level: number }> = new Map();

  // Draw from outermost (level 0) to innermost
  for (let i = 0; i < sorted.length; i++) {
    const layer = sorted[i];
    const depth = i; // 0 = outermost drawn first
    const insetX = depth * LAYER_MARGIN;
    const insetY = depth * LAYER_MARGIN;

    const lx = PAD + insetX;
    const ly = diagramTop + insetY;
    const lw = availableW - insetX * 2;
    const lh = availableH - insetY * 2;

    if (lw < 40 || lh < 40) continue;

    const lc = getLayerColor(layer.level, maxLevel);

    layerBounds.set(layer.id, { x: lx, y: ly, w: lw, h: lh, level: layer.level });

    // Layer rect
    parts.push(roundedRect(lx, ly, lw, lh, 8 - depth * 0.5, {
      fill: lc.fill,
      stroke: lc.border,
      'stroke-width': 1.2,
      'fill-opacity': 0.6,
    }));

    // Label at top-left of the layer band
    parts.push(text(lx + 10, ly + 16, layer.name, {
      fill: lc.text,
      'font-size': 11,
      'font-weight': 'bold',
      'font-family': FONT,
    }));

    // Technology at top-right
    if (layer.technology) {
      parts.push(text(lx + lw - 10, ly + 16, layer.technology, {
        fill: lc.text,
        'font-size': 9,
        'font-family': MONO,
        'text-anchor': 'end',
        opacity: 0.8,
      }));
    }

    // Description at bottom-left
    if (layer.description) {
      const descTrunc = layer.description.length > 50 ? layer.description.slice(0, 49) + '\u2026' : layer.description;
      parts.push(text(lx + 10, ly + lh - 8, descTrunc, {
        fill: lc.text,
        'font-size': 9,
        'font-family': FONT,
        opacity: 0.7,
      }));
    }
  }

  // Flow arrows
  // Each flow has a path (array of layer IDs from outer to inner or vice-versa)
  for (let fi = 0; fi < flows.length; fi++) {
    const flow = flows[fi];
    if (flow.path.length < 2) continue;

    const offsetX = (fi - (flows.length - 1) / 2) * 30;
    const points: Array<{ x: number; y: number }> = [];

    for (const layerId of flow.path) {
      const bounds = layerBounds.get(layerId);
      if (!bounds) continue;
      // Place flow point at the top edge of each layer, offset horizontally
      points.push({ x: centerX + offsetX, y: bounds.y });
    }

    if (points.length < 2) continue;

    // Draw segmented arrow
    for (let j = 0; j < points.length - 1; j++) {
      const p1 = points[j];
      const p2 = points[j + 1];
      const isLast = j === points.length - 2;

      parts.push(path(
        `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
        {
          fill: 'none',
          stroke: 'hsl(0 0% 95%)',
          'stroke-width': 1.2,
          'stroke-opacity': 0.7,
          ...(isLast ? { 'marker-end': 'url(#sec-flow-arrow)' } : {}),
        }
      ));
    }

    // Flow label at start
    parts.push(text(points[0].x + 6, points[0].y - 4, flow.name, {
      fill: 'hsl(0 0% 95%)',
      'font-size': 9,
      'font-family': FONT,
      opacity: 0.8,
    }));
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as SecurityLayerMapData;
  const layers = data.layers || [];

  const layerCount = layers.length || 1;
  const innerMin = MIN_INNER_SIZE;
  const totalMargin = layerCount * LAYER_MARGIN;

  const width = PAD * 2 + innerMin + totalMargin * 2;
  const height = PAD + 36 + PAD + innerMin + totalMargin * 2;

  return {
    width: Math.max(width, 400),
    height: Math.max(height, 300),
  };
}
