import type { Board, Section, Element, SectionCategory } from '../models/board.js';
import type { NoteData, TextBlockData } from '../models/elements.js';
import { getRenderer } from './diagram-renderers/index.js';
import { getStatusColor } from './theme.js';
import { BOARD_SHELL_HTML } from './templates/board-shell.js';
import { BOARD_CSS } from './templates/board-css.js';
import { BOARD_JS } from './templates/board-js.js';

export interface RenderOptions {
  includeTimeline?: boolean;
  includeMinimap?: boolean;
  sections?: string[];
  theme?: 'dark' | 'light';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Auto-layout: pack cards into a grid with section grouping ---

interface CardInfo {
  id: string;
  sectionId: string;
  sectionTitle: string;
  category: SectionCategory;
  type: string;
  html: string;
  w: number;
  h: number;
  x: number;
  y: number;
}

const CARD_HEADER_H = 34; // card-header height
const CARD_BODY_PAD = 20; // card-body padding (top + bottom)
const CARD_DESC_H = 20;   // description line if present
const MIN_CARD_W = 240;
const MIN_CARD_H = 100;

// Shared note content parser — used by both measureCardSize and renderNoteCard
interface ParsedNote {
  mode: 'kv' | 'numbered' | 'prose';
  kvPairs: Array<{ key: string; value: string }>;
  plainParts: string[];
  numberedParts: Array<{ num: string; text: string }>;
  proseText: string;
}

function parseNoteContent(content: string): ParsedNote {
  const kvEntries = content.split(/(?<=\.)\s+/).filter(s => s.trim());
  const kvPairs: Array<{ key: string; value: string }> = [];
  const plainParts: string[] = [];

  for (const entry of kvEntries) {
    const ci = entry.indexOf(':');
    if (ci > 0 && ci < 35 && !entry.match(/^(If |When |For |The |This |That |No |Each |Also )/i)) {
      kvPairs.push({ key: entry.slice(0, ci).trim(), value: entry.slice(ci + 1).trim().replace(/\.$/, '') });
    } else {
      plainParts.push(entry.trim().replace(/\.$/, ''));
    }
  }

  if (kvPairs.length >= 2 && kvPairs.length >= plainParts.length) {
    return { mode: 'kv', kvPairs, plainParts, numberedParts: [], proseText: '' };
  }

  const numbered = content.match(/\(\d+\)/g);
  if (numbered && numbered.length >= 2) {
    const parts = content.split(/(?=\(\d+\)\s*)/).filter(s => s.trim());
    const numberedParts: Array<{ num: string; text: string }> = [];
    const prose: string[] = [];
    for (const p of parts) {
      const m = p.match(/^\((\d+)\)\s*(.*)/s);
      if (m) numberedParts.push({ num: m[1], text: m[2].trim().replace(/\.$/, '') });
      else prose.push(p.trim());
    }
    return { mode: 'numbered', kvPairs: [], plainParts: prose, numberedParts, proseText: '' };
  }

  return { mode: 'prose', kvPairs: [], plainParts: [], numberedParts: [], proseText: content };
}

function measureCardSize(element: Element): { w: number; h: number } {
  // For notes and text blocks, estimate from text content
  if (element.type === 'note') {
    const data = element.data as NoteData;
    const parsed = parseNoteContent(data.content);
    const priorityH = data.priority ? 26 : 0;
    const notePad = 24; // note-inner padding top+bottom

    if (parsed.mode === 'kv') {
      const allEntries = [...parsed.kvPairs.map(kv => kv.key + ': ' + kv.value), ...parsed.plainParts];
      const w = Math.min(520, Math.max(340, Math.max(...allEntries.map(e => e.length * 4.2 + 60))));
      const valColW = w - 120; // key column ~80px + gaps
      let contentH = 0;
      for (const kv of parsed.kvPairs) {
        const lines = Math.max(1, Math.ceil(kv.value.length * 6.2 / valColW));
        contentH += lines * 18 + 12; // line height + padding
      }
      for (const p of parsed.plainParts) {
        const lines = Math.max(1, Math.ceil(p.length * 6.2 / (w - 30)));
        contentH += lines * 18 + 12;
      }
      return { w, h: CARD_HEADER_H + priorityH + contentH + notePad };
    }

    if (parsed.mode === 'numbered') {
      const w = 460;
      let contentH = 0;
      for (const np of parsed.numberedParts) {
        const lines = Math.max(1, Math.ceil(np.text.length * 6.2 / (w - 50)));
        contentH += lines * 18 + 12;
      }
      for (const p of parsed.plainParts) {
        const lines = Math.max(1, Math.ceil(p.length * 6.2 / (w - 30)));
        contentH += lines * 18 + 8;
      }
      return { w, h: CARD_HEADER_H + priorityH + contentH + notePad };
    }

    // Prose mode
    const w = Math.min(420, Math.max(300, data.content.length * 0.6));
    const charsPerLine = Math.floor((w - 28) / 6.2);
    const lines = Math.max(1, Math.ceil(data.content.length / charsPerLine));
    return { w, h: CARD_HEADER_H + priorityH + lines * 18 + notePad };
  }
  if (element.type === 'text_block') {
    const data = element.data as TextBlockData;
    // Find longest line to determine width
    const contentLines = data.content.split('\n');
    const maxLineLen = Math.max(...contentLines.map(l => l.length));
    const w = Math.max(360, Math.min(600, maxLineLen * 6.5 + 40));
    // Calculate height from wrapped lines (CSS: font-size 12px, line-height 1.7 = 20.4px/line)
    const LINE_H = 21;
    const charsPerLine = Math.floor((w - 40) / 6.5);
    let totalLines = 0;
    for (const line of contentLines) {
      totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      if (line.trim() === '') totalLines += 0.5;
    }
    return { w, h: CARD_HEADER_H + CARD_BODY_PAD + Math.ceil(totalLines) * LINE_H + 8 };
  }
  if (element.type === 'badge') {
    return { w: MIN_CARD_W, h: MIN_CARD_H };
  }

  // For diagrams, use the actual renderer calculateSize — no cap, let content determine size
  const renderer = getRenderer(element.type);
  const svgSize = renderer.calculateSize(element);
  const descH = element.description ? CARD_DESC_H : 0;
  return {
    w: Math.max(MIN_CARD_W, svgSize.width + 20),   // 10px padding each side
    h: Math.max(MIN_CARD_H, CARD_HEADER_H + descH + svgSize.height + 20),  // 10px padding top+bottom
  };
}

function binPackCards(cards: CardInfo[], sectionW: number, startX: number, startY: number, gap: number): number {
  // Pack cards into rows within the given section width
  // Returns the total height used
  let rowX = startX;
  let rowY = startY;
  let rowMaxH = 0;

  for (const card of cards) {
    // Does this card fit in the current row?
    if (rowX > startX && rowX + card.w > startX + sectionW) {
      // Wrap to next row
      rowY += rowMaxH + gap;
      rowX = startX;
      rowMaxH = 0;
    }

    card.x = rowX;
    card.y = rowY;
    rowX += card.w + gap;
    rowMaxH = Math.max(rowMaxH, card.h);
  }

  return (rowY - startY) + rowMaxH;
}

function autoLayout(cards: CardInfo[]): { width: number; height: number } {
  // Group cards by section
  const sectionMap = new Map<string, CardInfo[]>();
  const sectionOrder: string[] = [];
  for (const card of cards) {
    if (!sectionMap.has(card.sectionId)) {
      sectionMap.set(card.sectionId, []);
      sectionOrder.push(card.sectionId);
    }
    sectionMap.get(card.sectionId)!.push(card);
  }

  const CARD_GAP = 16;
  const SECTION_COL_GAP = 40;
  const SECTION_ROW_GAP = 50;
  const SECTION_LABEL_H = 28;
  const SECTIONS_PER_ROW = 3;
  const PAD = 24;

  // Step 1: Compute section widths (widest card) and bin-packed heights
  const sectionWidths = new Map<string, number>();
  const sectionHeights = new Map<string, number>();
  for (const secId of sectionOrder) {
    const secCards = sectionMap.get(secId)!;
    const maxW = Math.max(...secCards.map(c => c.w));
    sectionWidths.set(secId, maxW);
    // Simulate bin-packing to get the height
    const h = SECTION_LABEL_H + binPackCards(
      secCards.map(c => ({ ...c })), // clone to not mutate
      maxW, 0, 0, CARD_GAP
    );
    sectionHeights.set(secId, h);
  }

  // Step 2: Arrange sections in rows of 3, place cards with bin-packing
  let totalW = 0;
  let curY = PAD;

  for (let i = 0; i < sectionOrder.length; i += SECTIONS_PER_ROW) {
    const rowSections = sectionOrder.slice(i, i + SECTIONS_PER_ROW);

    // Row height = tallest section
    let rowMaxH = 0;
    for (const secId of rowSections) {
      rowMaxH = Math.max(rowMaxH, sectionHeights.get(secId)!);
    }

    // Place sections left to right
    let colX = PAD;
    for (const secId of rowSections) {
      const secCards = sectionMap.get(secId)!;
      const secW = sectionWidths.get(secId)!;

      // Bin-pack cards within this section column
      binPackCards(secCards, secW, colX, curY + SECTION_LABEL_H, CARD_GAP);

      colX += secW + SECTION_COL_GAP;
      totalW = Math.max(totalW, colX);
    }

    curY += rowMaxH + SECTION_ROW_GAP;
  }

  return { width: totalW + PAD, height: curY + PAD };
}

export function renderBoardToHtml(board: Board, options: RenderOptions = {}): string {
  let sections = board.sections.filter(s => !s.parent_section_id);
  if (options.sections && options.sections.length > 0) {
    const sectionSet = new Set(options.sections);
    sections = sections.filter(s => sectionSet.has(s.id));
  }

  // Build card info list
  const cards: CardInfo[] = [];
  for (const section of sections) {
    for (const element of section.elements) {
      const size = measureCardSize(element);
      cards.push({
        id: element.id,
        sectionId: section.id,
        sectionTitle: section.title,
        category: section.category,
        type: element.type,
        html: renderCardInner(element),
        w: size.w,
        h: size.h,
        x: 0,
        y: 0,
      });
    }
    // Include children sections
    const children = board.sections.filter(s => s.parent_section_id === section.id);
    for (const child of children) {
      for (const element of child.elements) {
        const size = measureCardSize(element);
        cards.push({
          id: element.id,
          sectionId: section.id,
          sectionTitle: section.title,
          category: section.category,
          type: element.type,
          html: renderCardInner(element),
          w: size.w,
          h: size.h,
          x: 0,
          y: 0,
        });
      }
    }
  }

  // Auto-layout
  const canvasSize = autoLayout(cards);

  // Build section labels
  const sectionLabels: string[] = [];
  const sectionBounds = new Map<string, { x: number; y: number; maxX: number; maxY: number; title: string }>();

  for (const card of cards) {
    const bounds = sectionBounds.get(card.sectionId);
    if (!bounds) {
      sectionBounds.set(card.sectionId, {
        x: card.x, y: card.y - 30,
        maxX: card.x + card.w,
        maxY: card.y + card.h,
        title: card.sectionTitle,
      });
    } else {
      bounds.x = Math.min(bounds.x, card.x);
      bounds.y = Math.min(bounds.y, card.y - 30);
      bounds.maxX = Math.max(bounds.maxX, card.x + card.w);
      bounds.maxY = Math.max(bounds.maxY, card.y + card.h);
    }
  }

  for (const [, b] of sectionBounds) {
    sectionLabels.push(`<div class="section-label" style="left:${b.x - 10}px;top:${b.y - 5}px;width:${b.maxX - b.x + 20}px;height:${b.maxY - b.y + 15}px"><span class="label-text">${esc(b.title)}</span><div class="resize-handle"></div></div>`);
  }

  // Build card HTML — notes and text_blocks get auto height (no fixed height in CSS)
  const autoHeightTypes = new Set(['note', 'text_block']);
  const cardHtmls = cards.map(card => {
    const heightStyle = autoHeightTypes.has(card.type) ? '' : `height:${card.h}px;`;
    return `<div class="bloo-card" data-card-id="${esc(card.id)}" data-type="${esc(card.type)}" style="left:${card.x}px;top:${card.y}px;width:${card.w}px;${heightStyle}">${card.html}<div class="resize-handle"></div></div>`;
  });

  // Set canvas size
  const canvasHtml = sectionLabels.join('\n') + '\n' + cardHtmls.join('\n');

  // Tags
  const tagsHtml = board.tags.map(t => `<span class="board-tag">${esc(t)}</span>`).join('');

  // Compose
  let html = BOARD_SHELL_HTML;
  html = html.replaceAll('{{BOARD_TITLE}}', esc(board.name));
  html = html.replace('{{BOARD_VERSION}}', String(board.version));
  html = html.replace('{{BOARD_TAGS_HTML}}', tagsHtml);
  html = html.replace('{{BOARD_CSS}}', BOARD_CSS);
  html = html.replace('{{CARDS_HTML}}', canvasHtml);
  html = html.replace('{{BOARD_DATA}}', JSON.stringify(board));
  html = html.replace('{{BOARD_INTERACTIVITY_JS}}', BOARD_JS);

  return html;
}

function renderCardInner(element: Element): string {
  if (element.type === 'note') return renderNoteCard(element);
  if (element.type === 'text_block') return renderTextBlockCard(element);

  const renderer = getRenderer(element.type);
  const svgContent = renderer.render(element);
  const svgSize = renderer.calculateSize(element);
  const statusColor = getStatusColor(element.status);
  const typeLabel = element.type.replace(/_/g, ' ');

  return `<div class="card-header"><div><span class="card-name">${esc(element.name)}</span><span class="status-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${statusColor};margin-left:6px;vertical-align:middle"></span></div><span class="card-type">${esc(typeLabel)}</span></div><div class="card-body">${element.description ? `<div class="card-desc">${esc(element.description)}</div>` : ''}<svg viewBox="0 0 ${svgSize.width} ${svgSize.height}" width="${svgSize.width}" height="${svgSize.height}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg></div>`;
}

function renderNoteCard(element: Element): string {
  const data = element.data as NoteData;
  const color = data.color || 'blue';
  const priority = data.priority;
  const parsed = parseNoteContent(data.content);

  let contentHtml: string;

  if (parsed.mode === 'kv') {
    const rows = parsed.kvPairs.map(kv =>
      `<div class="note-item"><div class="note-item-key">${esc(kv.key)}</div><div class="note-item-val">${esc(kv.value)}</div></div>`
    );
    if (parsed.plainParts.length > 0) {
      rows.push(...parsed.plainParts.map(p =>
        `<div class="note-item"><div class="note-item-full">${esc(p)}</div></div>`
      ));
    }
    contentHtml = rows.join('');
  } else if (parsed.mode === 'numbered') {
    const parts: string[] = [];
    for (const p of parsed.plainParts) {
      parts.push(`<div class="note-prose">${esc(p)}</div>`);
    }
    for (const np of parsed.numberedParts) {
      parts.push(`<div class="note-item"><div class="note-item-num">${np.num}</div><div class="note-item-val">${esc(np.text)}</div></div>`);
    }
    contentHtml = parts.join('');
  } else {
    contentHtml = `<div class="note-prose">${esc(parsed.proseText)}</div>`;
  }

  return `<div class="card-header"><span class="card-name">${esc(element.name)}</span><span class="card-type">note</span></div><div class="note-inner ${color}">${priority ? `<div class="note-priority ${priority}">${esc(priority)}</div>` : ''}${contentHtml}</div>`;
}

function renderTextBlockCard(element: Element): string {
  const data = element.data as TextBlockData;
  const lines = data.content.split('\n');
  const htmlContent = lines.map(l => {
    if (!l.trim()) return '<br/>';
    // Bold markdown-style headers
    if (l.match(/^\d+\./)) return `<div style="margin:4px 0"><strong>${esc(l)}</strong></div>`;
    return `<div>${esc(l)}</div>`;
  }).join('');

  return `<div class="card-header"><span class="card-name">${esc(element.name)}</span><span class="card-type">text</span></div><div class="card-body"><div class="text-block-inner">${htmlContent}</div></div>`;
}
