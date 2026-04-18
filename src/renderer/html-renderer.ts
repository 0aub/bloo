import type { Board, Element, SectionCategory } from '../models/board.js';
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

// Card sizing matching the React BoardView.tsx cardSize exactly
function measureCardSize(element: Element): { w: number; h: number } {
  if (element.type === 'note' || element.type === 'text_block') {
    const content = (element.data as any)?.content || '';
    const contentLines = content.split('\n');
    const maxLineLen = Math.max(...contentLines.map((l: string) => l.length));
    const w = Math.max(360, Math.min(580, maxLineLen * 6.2 + 60));
    const charsPerLine = Math.max(1, Math.floor((w - 40) / 6.2));
    let totalLines = 0;
    for (const ln of contentLines) {
      if (ln.trim() === '') { totalLines += 0.4; continue; }
      if (ln.match(/^#{1,3}\s/)) { totalLines += 1.5; continue; }
      totalLines += Math.max(1, Math.ceil(ln.length / charsPerLine));
    }
    return { w, h: CARD_HEADER_H + Math.ceil(totalLines) * 18 + 30 };
  }
  if (element.type === 'badge') {
    const renderer = getRenderer(element.type);
    const svgSize = renderer.calculateSize(element);
    return { w: Math.max(MIN_CARD_W, svgSize.width + 20), h: MIN_CARD_H };
  }

  const renderer = getRenderer(element.type);
  const svgSize = renderer.calculateSize(element);
  const descH = element.description ? CARD_DESC_H : 0;
  return {
    w: Math.max(MIN_CARD_W, svgSize.width + 20),
    h: Math.max(MIN_CARD_H, CARD_HEADER_H + descH + svgSize.height + 20),
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

  // Step 2: First pass — compute row widths to find the widest row
  let maxRowW = 0;
  let curY = PAD;

  // Compute each row's total width
  const rowInfos: Array<{ sections: string[]; rowW: number; rowH: number }> = [];
  for (let i = 0; i < sectionOrder.length; i += SECTIONS_PER_ROW) {
    const rowSections = sectionOrder.slice(i, i + SECTIONS_PER_ROW);
    let rowW = 0;
    let rowH = 0;
    for (const secId of rowSections) {
      rowW += sectionWidths.get(secId)!;
      rowH = Math.max(rowH, sectionHeights.get(secId)!);
    }
    rowW += (rowSections.length - 1) * SECTION_COL_GAP;
    maxRowW = Math.max(maxRowW, rowW);
    rowInfos.push({ sections: rowSections, rowW, rowH });
  }

  // Step 3: Place sections — center each row within the widest row width
  const CANVAS_MARGIN = 300;
  const canvasContentW = maxRowW;
  curY = PAD;

  for (const { sections: rowSections, rowW, rowH } of rowInfos) {
    // Center this row within the max row width
    let colX = PAD + (canvasContentW - rowW) / 2;

    for (const secId of rowSections) {
      const secCards = sectionMap.get(secId)!;
      const secW = sectionWidths.get(secId)!;
      binPackCards(secCards, secW, colX, curY + SECTION_LABEL_H, CARD_GAP);
      colX += secW + SECTION_COL_GAP;
    }

    curY += rowH + SECTION_ROW_GAP;
  }

  // Add margins and compute canvas size
  const contentW = canvasContentW + PAD * 2;
  const contentH = curY + PAD;
  const canvasW = contentW + CANVAS_MARGIN * 2;
  const canvasH = contentH + CANVAS_MARGIN * 2;

  // Shift all cards by margin offset
  for (const card of cards) {
    card.x += CANVAS_MARGIN;
    card.y += CANVAS_MARGIN;
  }

  return { width: canvasW, height: canvasH };
}

export function renderBoardToHtml(board: Board, options: RenderOptions = {}): string {
  const CATEGORY_ORDER: Record<string, number> = {
    project_meta: 0, system_structure: 1, data_layer: 2, api_integration: 3,
    security: 4, infrastructure: 5, processes: 6, user_flows: 7,
  };
  let sections = board.sections.filter(s => !s.parent_section_id);
  sections.sort((a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99));
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

  // Resize handles HTML (8 points: 4 corners + 4 midpoints)
  const resizeHandles = '<div class="resize-handle rh-tl" data-rh="tl"></div><div class="resize-handle rh-tr" data-rh="tr"></div><div class="resize-handle rh-bl" data-rh="bl"></div><div class="resize-handle rh-br" data-rh="br"></div><div class="resize-handle rh-tm" data-rh="tm"></div><div class="resize-handle rh-bm" data-rh="bm"></div><div class="resize-handle rh-ml" data-rh="ml"></div><div class="resize-handle rh-mr" data-rh="mr"></div>';

  for (const [, b] of sectionBounds) {
    sectionLabels.push(`<div class="section-label" style="left:${b.x - 10}px;top:${b.y - 5}px;width:${b.maxX - b.x + 20}px;height:${b.maxY - b.y + 15}px"><span class="label-text">${esc(b.title)}</span>${resizeHandles}</div>`);
  }

  // Build card HTML — notes and text_blocks get auto height (no fixed height in CSS)
  const autoHeightTypes = new Set(['note', 'text_block']);
  const cardHtmls = cards.map(card => {
    const heightStyle = autoHeightTypes.has(card.type) ? '' : `height:${card.h}px;`;
    return `<div class="bloo-card" data-card-id="${esc(card.id)}" data-type="${esc(card.type)}" style="left:${card.x}px;top:${card.y}px;width:${card.w}px;${heightStyle}">${card.html}${resizeHandles}</div>`;
  });

  // Set canvas content
  const canvasHtml = sectionLabels.join('\n') + '\n' + cardHtmls.join('\n');

  // Tags removed — not shown in header

  // Split board name into title + subtitle (split on " — " or " - ")
  const nameParts = board.name.split(/\s[—–-]\s/);
  const mainTitle = nameParts[0].trim();
  const subtitle = nameParts.length > 1 ? nameParts.slice(1).join(' — ').trim() : '';

  // Compose
  let html = BOARD_SHELL_HTML;
  html = html.replaceAll('{{BOARD_TITLE}}', esc(board.name));
  html = html.replace('{{BOARD_MAIN_TITLE}}', esc(mainTitle));
  html = html.replace('{{BOARD_SUBTITLE}}', esc(subtitle));
  html = html.replace('{{BOARD_VERSION}}', String(board.version));
  html = html.replace('{{BOARD_TAGS_HTML}}', '');
  html = html.replace('{{BOARD_CSS}}', BOARD_CSS);
  html = html.replace('{{CANVAS_W}}', String(Math.round(canvasSize.width)));
  html = html.replace('{{CANVAS_H}}', String(Math.round(canvasSize.height)));
  html = html.replace('{{CARDS_HTML}}', canvasHtml);
  // Build print container for PDF export
  const printPages: string[] = [];

  // Cover page
  printPages.push(`<div class="print-page"><div class="print-cover"><div class="print-cover-title">${esc(mainTitle)}</div>${subtitle ? `<div class="print-cover-subtitle">${esc(subtitle)}</div>` : ''}<div class="print-cover-desc">${esc(board.description)}</div><div class="print-cover-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div><div class="print-cover-brand">Generated by Bloo</div></div></div>`);

  // Element pages
  for (const card of cards) {
    const section = board.sections.find(s => s.id === card.sectionId);
    const sectionTitle = section?.title || '';
    printPages.push(`<div class="print-page"><div class="print-header"><span>${esc(mainTitle)}</span><span>${esc(sectionTitle)}</span></div><div class="print-content"><div class="print-el-title">${esc(card.html.match(/card-name"?>([^<]*)</)?.[1] || '')}</div><div class="print-el-type">${esc(card.type.replace(/_/g, ' '))}</div><div class="print-el-body">${card.html}</div></div><div class="print-footer"><span>Bloo Documentation</span><span>${esc(sectionTitle)}</span></div></div>`);
  }

  html = html.replace('{{PRINT_CONTAINER}}', `<div id="print-container">${printPages.join('\n')}</div>`);
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

// Markdown renderer matching the React NoteCard/TextBlockCard
function renderMarkdownHtml(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (inList) { out.push('</div>'); inList = false; }
      out.push('<div style="height:6px"></div>');
      continue;
    }
    let line = esc(trimmed);
    line = line.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
    line = line.replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>');

    const h3 = trimmed.match(/^### (.+)$/);
    const h2 = trimmed.match(/^## (.+)$/);
    const h1 = trimmed.match(/^# (.+)$/);
    if (h3) { if (inList) { out.push('</div>'); inList = false; } let t = esc(h3[1]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); out.push(`<div style="font-weight:700;font-size:12px;margin:10px 0 3px;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:3px">${t}</div>`); continue; }
    if (h2) { if (inList) { out.push('</div>'); inList = false; } let t = esc(h2[1]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); out.push(`<div style="font-weight:700;font-size:13px;margin:12px 0 4px;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:3px">${t}</div>`); continue; }
    if (h1) { if (inList) { out.push('</div>'); inList = false; } let t = esc(h1[1]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); out.push(`<div style="font-weight:800;font-size:14px;margin:14px 0 5px;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:4px">${t}</div>`); continue; }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) { if (!inList) { out.push('<div style="margin:4px 0 4px 4px">'); inList = true; } out.push(`<div style="display:flex;gap:6px;margin:1px 0;line-height:1.5"><span style="color:var(--accent);flex-shrink:0">&bull;</span><span>${line.replace(/^[-*]\s+/, '')}</span></div>`); continue; }

    const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) { if (!inList) { out.push('<div style="margin:4px 0 4px 4px">'); inList = true; } let c = esc(numbered[2]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>'); out.push(`<div style="display:flex;gap:6px;margin:1px 0;line-height:1.5"><span style="color:var(--accent);font-weight:700;flex-shrink:0">${numbered[1]}.</span><span>${c}</span></div>`); continue; }

    if (inList) { out.push('</div>'); inList = false; }
    out.push(`<div style="margin:2px 0;line-height:1.6">${line}</div>`);
  }
  if (inList) out.push('</div>');
  return out.join('');
}

function renderNoteCard(element: Element): string {
  const data = element.data as NoteData;
  const contentHtml = renderMarkdownHtml(data.content);
  const colorStr = data.color as string | undefined;
  const borderColor = colorStr === 'yellow' ? 'hsl(38 70% 45%)' : colorStr === 'green' ? 'hsl(152 50% 40%)' : colorStr === 'red' ? 'hsl(0 50% 45%)' : colorStr === 'orange' ? 'hsl(25 70% 50%)' : colorStr === 'pink' ? 'hsl(340 45% 50%)' : colorStr === 'purple' ? 'hsl(280 40% 50%)' : 'var(--accent)';
  const priorityHtml = data.priority ? `<span style="display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;padding:1px 8px;border-radius:3px;margin-bottom:6px;background:hsl(38 50% 20%);color:hsl(38 80% 65%)">${esc(data.priority)}</span>` : '';

  return `<div class="card-header"><span class="card-name">${esc(element.name)}</span><span class="card-type">note</span></div><div style="border-left:3px solid ${borderColor};border-radius:0 8px 8px 0;padding:10px 14px;font-size:12px;color:var(--fg);overflow:auto">${priorityHtml}${contentHtml}</div>`;
}

function renderTextBlockCard(element: Element): string {
  const data = element.data as TextBlockData;
  const contentHtml = renderMarkdownHtml(data.content);
  return `<div class="card-header"><span class="card-name">${esc(element.name)}</span><span class="card-type">text</span></div><div class="card-body" style="padding:4px 8px;font-size:12px;color:var(--fg)">${contentHtml}</div>`;
}
