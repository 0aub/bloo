import type { Element, Size } from '../../models/board.js';
import type { CicdPipelineData } from '../../models/elements.js';
import { escapeHtml, roundedRect, rect, text, group, path, defs, marker } from './svg-builder.js';

const FONT = "'Almarai','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";

const PAD = 24;
const MIN_STAGE_WIDTH = 160;
const STAGE_GAP = 48;
const STEP_HEIGHT = 28;
const STEP_GAP = 4;
const STAGE_PAD_TOP = 44;
const STAGE_PAD_BOTTOM = 12;
const STAGE_PAD_X = 14;
const MIN_TRIGGER_WIDTH = 80;
const TRIGGER_HEIGHT = 40;
const CHAR_W = 6.5;
const ENV_TAG_HEIGHT = 20;

const envColors: Record<string, { bg: string; border: string; text: string }> = {
  production: { bg: 'hsl(0 40% 15%)', border: 'hsl(0 60% 55%)', text: 'hsl(0 60% 70%)' },
  staging: { bg: 'hsl(35 45% 15%)', border: 'hsl(35 70% 55%)', text: 'hsl(35 70% 70%)' },
  development: { bg: 'hsl(210 40% 15%)', border: 'hsl(210 50% 55%)', text: 'hsl(210 50% 70%)' },
  test: { bg: 'hsl(152 40% 15%)', border: 'hsl(152 55% 45%)', text: 'hsl(152 55% 65%)' },
};

function getEnvColor(env: string): { bg: string; border: string; text: string } {
  const key = env.toLowerCase();
  for (const [k, v] of Object.entries(envColors)) {
    if (key.includes(k)) return v;
  }
  return { bg: 'hsl(155 5% 15%)', border: 'hsl(155 5% 45%)', text: 'hsl(155 5% 65%)' };
}

function stageHeight(stepCount: number, hasEnv: boolean): number {
  return STAGE_PAD_TOP + stepCount * (STEP_HEIGHT + STEP_GAP) + STAGE_PAD_BOTTOM + (hasEnv ? ENV_TAG_HEIGHT + 8 : 0);
}

export function render(element: Element): string {
  const data = element.data as CicdPipelineData;
  const { trigger, platform, stages } = data;
  const size = calculateSize(element);

  const parts: string[] = [];

  // Arrow marker definition
  parts.push(defs(
    marker('pipeline-arrow', 6, 4, 8, 8,
      path('M 0 0 L 8 4 L 0 8 Z', { fill: 'hsl(152 65% 55%)' })
    )
  ));

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

  // Platform label
  if (platform) {
    parts.push(text(PAD, PAD + 30, platform, {
      fill: 'hsl(155 5% 55%)',
      'font-size': 10,
      'font-family': FONT,
    }));
  }

  const flowY = PAD + 50;

  // Compute max stage height for vertical centering
  const maxH = Math.max(...stages.map(s => stageHeight(s.steps.length, !!s.environment)));
  const centerY = flowY + maxH / 2;

  // Compute dynamic widths based on text content
  const triggerW = Math.max(MIN_TRIGGER_WIDTH, trigger.length * CHAR_W + 24);
  const stageWidths: number[] = stages.map(stage => {
    const nameW = stage.name.length * (CHAR_W + 1) + STAGE_PAD_X * 2;
    const stepWs = stage.steps.map(step => {
      const stepText = step.command || step.name;
      return stepText.length * CHAR_W + STAGE_PAD_X * 2 + 16;
    });
    const maxStepW = Math.max(0, ...stepWs);
    const envW = stage.environment ? stage.environment.length * 7 + STAGE_PAD_X * 2 + 16 : 0;
    return Math.max(MIN_STAGE_WIDTH, nameW, maxStepW, envW);
  });

  // Trigger badge
  const triggerX = PAD;
  const triggerY = centerY - TRIGGER_HEIGHT / 2;

  // Chevron-shaped trigger badge
  const chevW = triggerW;
  const chevH = TRIGGER_HEIGHT;
  parts.push(path(
    `M ${triggerX} ${triggerY} L ${triggerX + chevW - 12} ${triggerY} L ${triggerX + chevW} ${triggerY + chevH / 2} L ${triggerX + chevW - 12} ${triggerY + chevH} L ${triggerX} ${triggerY + chevH} Z`,
    {
      fill: 'hsl(152 40% 15%)',
      stroke: 'hsl(152 65% 55%)',
      'stroke-width': 1.2,
    }
  ));
  parts.push(text(triggerX + (chevW - 12) / 2, triggerY + chevH / 2 + 4, trigger, {
    fill: 'hsl(152 65% 55%)',
    'font-size': 11,
    'font-weight': 'bold',
    'font-family': MONO,
    'text-anchor': 'middle',
  }));

  let stageX = PAD + triggerW + STAGE_GAP;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const sH = stageHeight(stage.steps.length, !!stage.environment);
    const sY = centerY - sH / 2;

    const SW = stageWidths[i];

    // Stage card
    parts.push(roundedRect(stageX, sY, SW, sH, 6, {
      fill: 'hsl(160 10% 10% / 0.8)',
      stroke: 'hsl(160 8% 18%)',
      'stroke-width': 1,
    }));

    // Parallel indicator
    if (stage.parallel) {
      parts.push(roundedRect(stageX + SW - 48, sY + 6, 40, 16, 3, {
        fill: 'hsl(280 35% 15%)',
        stroke: 'hsl(280 45% 55%)',
        'stroke-width': 0.8,
      }));
      parts.push(text(stageX + SW - 28, sY + 17, 'parallel', {
        fill: 'hsl(280 45% 55%)',
        'font-size': 8,
        'font-family': MONO,
        'text-anchor': 'middle',
      }));
    }

    // Stage name
    parts.push(text(stageX + STAGE_PAD_X, sY + 22, stage.name, {
      fill: 'hsl(0 0% 95%)',
      'font-size': 13,
      'font-weight': 'bold',
      'font-family': FONT,
    }));

    // Separator
    parts.push(`<line x1="${stageX + STAGE_PAD_X}" y1="${sY + STAGE_PAD_TOP - 8}" x2="${stageX + SW - STAGE_PAD_X}" y2="${sY + STAGE_PAD_TOP - 8}" stroke="hsl(160 8% 18%)" stroke-width="0.8"/>`);

    // Steps
    let stepY = sY + STAGE_PAD_TOP;
    for (const step of stage.steps) {
      parts.push(roundedRect(stageX + STAGE_PAD_X, stepY, SW - STAGE_PAD_X * 2, STEP_HEIGHT, 4, {
        fill: 'hsl(160 15% 7%)',
        stroke: 'hsl(160 8% 18%)',
        'stroke-width': 0.6,
      }));
      const label = step.name;
      parts.push(text(stageX + STAGE_PAD_X + 8, stepY + STEP_HEIGHT / 2 + 4, label, {
        fill: 'hsl(155 5% 55%)',
        'font-size': 10,
        'font-family': MONO,
      }));
      stepY += STEP_HEIGHT + STEP_GAP;
    }

    // Environment tag
    if (stage.environment) {
      const ec = getEnvColor(stage.environment);
      const tagY = sY + sH - ENV_TAG_HEIGHT - 8;
      const tagW = stage.environment.length * 7 + 16;
      parts.push(roundedRect(stageX + STAGE_PAD_X, tagY, tagW, ENV_TAG_HEIGHT, 4, {
        fill: ec.bg,
        stroke: ec.border,
        'stroke-width': 0.8,
      }));
      parts.push(text(stageX + STAGE_PAD_X + tagW / 2, tagY + 13, stage.environment, {
        fill: ec.text,
        'font-size': 10,
        'font-family': MONO,
        'text-anchor': 'middle',
      }));
    }

    // Chevron arrow from previous element
    const arrowFromX = i === 0 ? PAD + triggerW : stageX - STAGE_GAP;
    const arrowToX = stageX;
    const arrowY = centerY;

    // Draw chevron arrow
    parts.push(path(
      `M ${arrowFromX + 8} ${arrowY}  L ${arrowToX - 8} ${arrowY}`,
      {
        fill: 'none',
        stroke: 'hsl(152 65% 55%)',
        'stroke-width': 1.5,
        'marker-end': 'url(#pipeline-arrow)',
      }
    ));

    stageX += SW + STAGE_GAP;
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as CicdPipelineData;
  const { stages } = data;

  const maxH = stages.length > 0
    ? Math.max(...stages.map(s => stageHeight(s.steps.length, !!s.environment)))
    : 80;

  const triggerW = Math.max(MIN_TRIGGER_WIDTH, (data.trigger || '').length * CHAR_W + 24);
  const stageWs = stages.map(stage => {
    const nameW = stage.name.length * (CHAR_W + 1) + STAGE_PAD_X * 2;
    const stepWs = stage.steps.map(step => {
      const t = step.command || step.name;
      return t.length * CHAR_W + STAGE_PAD_X * 2 + 16;
    });
    const envW = stage.environment ? stage.environment.length * 7 + STAGE_PAD_X * 2 + 16 : 0;
    return Math.max(MIN_STAGE_WIDTH, nameW, Math.max(0, ...stepWs), envW);
  });
  const width = PAD * 2 + triggerW + STAGE_GAP + stageWs.reduce((s, w) => s + w + STAGE_GAP, 0);
  const height = PAD + 50 + maxH + PAD;

  return { width: Math.max(width, 300), height: Math.max(height, 150) };
}
