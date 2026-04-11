import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';
import type { SequenceDiagramData, SequenceActor, SequenceMessage } from '../../models/elements.js';
import {
  escapeHtml,
  roundedRect,
  rect,
  text,
  line,
  group,
  path,
  defs,
  marker,
  curvedPath,
  cylinder,
  diamond,
  hexagon,
  parallelogram,
  circle,
  foreignObject,
  ellipse,
} from './svg-builder.js';
import { getComponentColor } from '../theme.js';

// ── Constants ────────────────────────────────────────────────────────────────

const FONT = "'Almarai','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";
const TITLE_SIZE = 12;
const BODY_SIZE = 11;
const LABEL_SIZE = 9;

const ACTOR_W = 100;
const ACTOR_H = 36;
const ACTOR_GAP = 36;
const MSG_GAP = 44;
const LIFELINE_START_Y = 70;
const CANVAS_PAD = 32;
const SELF_LOOP_W = 40;
const NOTE_W = 120;
const NOTE_H = 28;

const COL_BG = 'hsl(160 10% 10%)';
const COL_CARD_BG = 'hsl(160 10% 10%)';
const COL_TEXT = 'hsl(0 0% 95%)';
const COL_MUTED = 'hsl(155 5% 55%)';
const COL_BORDER = 'hsl(160 8% 18%)';
const COL_ACCENT = 'hsl(152 65% 55%)';
const COL_CONN = 'hsl(155 5% 35%)';
const COL_NOTE_BG = 'hsl(38 50% 15%)';
const COL_NOTE_BORDER = 'hsl(38 70% 45%)';
const COL_NOTE_TEXT = 'hsl(38 60% 70%)';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ActorLayout {
  id: string;
  actor: SequenceActor;
  x: number;         // centre x of the actor box
  boxX: number;      // left edge of actor box
  boxY: number;
  boxW: number;      // width of actor box (dynamic based on name)
}

function arrowDefs(): string {
  // Solid arrowhead (sync)
  const syncArrow = marker(
    'seq-arrow-sync',
    9,
    5,
    10,
    10,
    path('M 0 0 L 10 5 L 0 10 z', { fill: COL_TEXT }),
  );
  // Open arrowhead (async)
  const asyncArrow = marker(
    'seq-arrow-async',
    9,
    5,
    10,
    10,
    path('M 0 0 L 10 5 L 0 10', { fill: 'none', stroke: COL_TEXT, 'stroke-width': 1.5 }),
  );
  // Response arrowhead (dotted)
  const respArrow = marker(
    'seq-arrow-resp',
    9,
    5,
    10,
    10,
    path('M 0 0 L 10 5 L 0 10', { fill: 'none', stroke: COL_MUTED, 'stroke-width': 1.5 }),
  );
  return defs(syncArrow + asyncArrow + respArrow);
}

// ── Actor rendering ──────────────────────────────────────────────────────────

function renderActor(al: ActorLayout): string {
  const parts: string[] = [];

  // Actor box
  parts.push(
    roundedRect(al.boxX, al.boxY, al.boxW, ACTOR_H, 6, {
      fill: COL_CARD_BG,
      stroke: COL_BORDER,
      'stroke-width': 1.5,
    }),
  );

  // Actor name
  parts.push(
    text(al.x, al.boxY + ACTOR_H / 2 + 1, al.actor.name, {
      fill: COL_TEXT,
      'font-size': TITLE_SIZE,
      'font-weight': 'bold',
      'font-family': FONT,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    }),
  );

  // Type badge
  if (al.actor.type) {
    parts.push(
      text(al.x, al.boxY + ACTOR_H + 14, al.actor.type, {
        fill: COL_MUTED,
        'font-size': LABEL_SIZE - 1,
        'font-family': MONO,
        'text-anchor': 'middle',
      }),
    );
  }

  return group(parts, undefined, { 'data-node-id': al.actor.id });
}

// ── Lifeline rendering ──────────────────────────────────────────────────────

function renderLifeline(al: ActorLayout, endY: number): string {
  return line(al.x, al.boxY + ACTOR_H, al.x, endY, {
    stroke: COL_BORDER,
    'stroke-width': 1,
    'stroke-dasharray': '4 3',
  });
}

// ── Message rendering ────────────────────────────────────────────────────────

function renderMessage(
  msg: SequenceMessage,
  actorMap: Map<string, ActorLayout>,
  y: number,
): string {
  const from = actorMap.get(msg.from);
  const to = actorMap.get(msg.to);
  if (!from || !to) return '';

  const parts: string[] = [];
  const msgType = msg.type || 'sync';

  // Self-message (loop back to same actor)
  if (msg.from === msg.to) {
    const sx = from.x;
    const loopPath = `M ${sx} ${y} L ${sx + SELF_LOOP_W} ${y} L ${sx + SELF_LOOP_W} ${y + 24} L ${sx} ${y + 24}`;
    parts.push(
      path(loopPath, {
        fill: 'none',
        stroke: COL_TEXT,
        'stroke-width': 1.5,
        'marker-end': 'url(#seq-arrow-sync)',
      }),
    );
    // Label
    parts.push(
      text(sx + SELF_LOOP_W + 6, y + 12, msg.label, {
        fill: COL_TEXT,
        'font-size': LABEL_SIZE,
        'font-family': FONT,
        'dominant-baseline': 'middle',
      }),
    );
  } else {
    const x1 = from.x;
    const x2 = to.x;

    // Line style
    let dash: string | undefined;
    let markerRef = 'url(#seq-arrow-sync)';
    let strokeCol = COL_TEXT;

    if (msgType === 'async') {
      dash = '6 3';
      markerRef = 'url(#seq-arrow-async)';
    } else if (msgType === 'response') {
      dash = '3 3';
      markerRef = 'url(#seq-arrow-resp)';
      strokeCol = COL_MUTED;
    }

    // Arrow line
    parts.push(
      line(x1, y, x2, y, {
        stroke: strokeCol,
        'stroke-width': 1.5,
        'stroke-dasharray': dash,
        'marker-end': markerRef,
      }),
    );

    // Label above the line
    const labelX = (x1 + x2) / 2;
    const labelY = y - 8;
    parts.push(
      text(labelX, labelY, msg.label, {
        fill: COL_TEXT,
        'font-size': LABEL_SIZE,
        'font-family': FONT,
        'text-anchor': 'middle',
      }),
    );
  }

  // Note callout
  if (msg.note) {
    const noteX = Math.max(from.x, to.x) + ACTOR_W / 2 + 10;
    const noteY = y - NOTE_H / 2;
    // Yellow callout box
    parts.push(
      roundedRect(noteX, noteY, NOTE_W, NOTE_H, 4, {
        fill: COL_NOTE_BG,
        stroke: COL_NOTE_BORDER,
        'stroke-width': 1,
      }),
    );
    // Fold triangle
    parts.push(
      path(
        `M ${noteX + NOTE_W - 10} ${noteY} L ${noteX + NOTE_W} ${noteY + 10} L ${noteX + NOTE_W - 10} ${noteY + 10} Z`,
        { fill: COL_NOTE_BORDER, opacity: '0.5' },
      ),
    );
    // Note text
    parts.push(
      text(noteX + 6, noteY + NOTE_H / 2 + 1, msg.note.slice(0, 25), {
        fill: COL_NOTE_TEXT,
        'font-size': LABEL_SIZE - 1,
        'font-family': FONT,
        'dominant-baseline': 'middle',
      }),
    );
  }

  return group(parts, undefined, { 'data-conn-from': msg.from, 'data-conn-to': msg.to });
}

// ── Layout ───────────────────────────────────────────────────────────────────

function measureTextWidth(s: string, fontSize: number): number {
  return s.length * fontSize * 0.58;
}

function layoutActors(
  actors: SequenceActor[],
  messages: SequenceMessage[] = [],
): { actorLayouts: ActorLayout[]; totalActorW: number } {
  const actorIndex = new Map<string, number>();
  actors.forEach((a, i) => actorIndex.set(a.id, i));

  // Compute minimum gap between each adjacent pair of actors
  // based on the longest message label that spans exactly between them
  const pairGaps: number[] = new Array(Math.max(0, actors.length - 1)).fill(ACTOR_GAP);

  for (const msg of messages) {
    if (msg.from === msg.to) continue; // self-message, no gap needed
    const fi = actorIndex.get(msg.from);
    const ti = actorIndex.get(msg.to);
    if (fi === undefined || ti === undefined) continue;

    const lo = Math.min(fi, ti);
    const hi = Math.max(fi, ti);
    const labelW = measureTextWidth(msg.label, LABEL_SIZE) + 20; // 20px padding

    if (hi - lo === 1) {
      // Adjacent actors: label must fit in this single gap
      pairGaps[lo] = Math.max(pairGaps[lo], labelW);
    } else {
      // Spans multiple actors: distribute label width across gaps
      const perGap = labelW / (hi - lo);
      for (let g = lo; g < hi; g++) {
        pairGaps[g] = Math.max(pairGaps[g], perGap);
      }
    }
  }

  // Also ensure actor names fit in their boxes
  const actorWidths: number[] = actors.map(a =>
    Math.max(ACTOR_W, measureTextWidth(a.name, TITLE_SIZE) + 20)
  );

  // Position actors using variable gaps
  const actorLayouts: ActorLayout[] = [];
  let curX = CANVAS_PAD;

  for (let i = 0; i < actors.length; i++) {
    const aw = actorWidths[i];
    const cx = curX + aw / 2;
    actorLayouts.push({
      id: actors[i].id,
      actor: actors[i],
      x: cx,
      boxX: curX,
      boxY: CANVAS_PAD,
      boxW: aw,
    });
    if (i < actors.length - 1) {
      curX += aw + pairGaps[i];
    } else {
      curX += aw;
    }
  }

  return { actorLayouts, totalActorW: curX + CANVAS_PAD };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function render(element: Element): string {
  const data = element.data as SequenceDiagramData;
  const actors = data.actors || [];
  const messages = [...(data.messages || [])].sort((a, b) => a.order - b.order);

  if (actors.length === 0) {
    return group([
      text(60, 40, 'No actors defined', {
        fill: COL_MUTED,
        'font-size': BODY_SIZE,
        'font-family': FONT,
      }),
    ]);
  }

  const { actorLayouts } = layoutActors(actors, messages);
  const actorMap = new Map(actorLayouts.map((a) => [a.id, a]));

  const parts: string[] = [];

  // Arrow defs
  parts.push(arrowDefs());

  // Calculate message y positions
  const msgYs: number[] = [];
  let curY = LIFELINE_START_Y;
  for (let i = 0; i < messages.length; i++) {
    curY += MSG_GAP;
    msgYs.push(curY);
    // Self-messages take extra space
    if (messages[i].from === messages[i].to) {
      curY += 24;
    }
    // Notes take extra space
    if (messages[i].note) {
      curY += 8;
    }
  }

  const endY = curY + MSG_GAP;

  // Lifelines (behind everything)
  for (const al of actorLayouts) {
    parts.push(renderLifeline(al, endY));
  }

  // Actor boxes at top
  for (const al of actorLayouts) {
    parts.push(renderActor(al));
  }

  // Actor boxes duplicated at bottom
  for (const al of actorLayouts) {
    const bottomAl: ActorLayout = { ...al, boxY: endY + 8, boxW: al.boxW };
    parts.push(renderActor(bottomAl));
  }

  // Messages
  for (let i = 0; i < messages.length; i++) {
    parts.push(renderMessage(messages[i], actorMap, msgYs[i]));
  }

  return group(parts);
}

export function calculateSize(element: Element): Size {
  const data = element.data as SequenceDiagramData;
  const actors = data.actors || [];
  const messages = [...(data.messages || [])].sort((a, b) => a.order - b.order);

  if (actors.length === 0) return { width: 300, height: 100 };

  const { totalActorW } = layoutActors(actors, messages);

  // Estimate height
  let h = LIFELINE_START_Y;
  for (const msg of messages) {
    h += MSG_GAP;
    if (msg.from === msg.to) h += 24;
    if (msg.note) h += 8;
  }
  h += MSG_GAP + ACTOR_H + CANVAS_PAD + 16; // bottom actors + padding

  // Account for notes extending past actor area
  const hasNotes = messages.some((m) => m.note);
  const noteExtra = hasNotes ? NOTE_W + 40 : 0;

  return {
    width: Math.max(300, totalActorW + noteExtra),
    height: Math.max(200, h),
  };
}
