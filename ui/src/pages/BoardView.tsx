import { useState, useEffect, useRef, useCallback } from 'react';
import { api, type Board, type Section, type Element } from '../api/client';
import { useTheme } from '../hooks/useTheme';
import Canvas, { type LayoutItem } from '../components/Canvas';
import type { CardPosition } from '../components/Card';
import Toolbar from '../components/Toolbar';
import SearchOverlay from '../components/SearchOverlay';

interface Props {
  boardId: string;
  onBack: () => void;
}

// ---- Layout constants (matching HTML renderer exactly) ----
const CARD_MIN_W = 240;
const CARD_HEADER_H = 34;
const CARD_DESC_H = 20;
const CARD_GAP = 16;
const SECTION_COL_GAP = 40;
const SECTION_ROW_GAP = 50;
const SECTION_LABEL_H = 28;
const SECTIONS_PER_ROW = 4;
const PAD = 24;
const CANVAS_MARGIN = 300;

// ---- Compute card size from SVG dimensions (matches HTML renderer logic) ----
function cardSize(el: Element, svgSizes?: Record<string, { width: number; height: number }>): { w: number; h: number } {
  const isNote = el.type === 'note';
  const isText = el.type === 'text' || el.type === 'text_block';
  const isBadge = el.type === 'badge';

  if (isNote || isText) {
    const content = (el.data as any)?.content || el.description || '';
    const contentLines = content.split('\n');
    const maxLineLen = Math.max(...contentLines.map((l: string) => l.length));
    const w = Math.max(360, Math.min(580, maxLineLen * 6.2 + 60));
    const charsPerLine = Math.floor((w - 40) / 6.2);
    let totalLines = 0;
    for (const ln of contentLines) {
      if (ln.trim() === '') { totalLines += 0.4; continue; }
      // Headers take ~1.5 lines of space
      if (ln.match(/^#{1,3}\s/)) { totalLines += 1.5; continue; }
      totalLines += Math.max(1, Math.ceil(ln.length / charsPerLine));
    }
    const h = CARD_HEADER_H + Math.ceil(totalLines) * 18 + 30;
    return { w, h };
  }
  if (isBadge) return { w: CARD_MIN_W, h: 100 };

  // Diagrams: use actual SVG size — no artificial cap
  const svg = svgSizes?.[el.id];
  if (!svg) return { w: CARD_MIN_W, h: 200 };

  const descH = el.description ? CARD_DESC_H : 0;
  return {
    w: Math.max(CARD_MIN_W, svg.width + 20),
    h: Math.max(100, CARD_HEADER_H + descH + svg.height + 20),
  };
}

// ---- Card info for layout ----
interface CardInfo {
  element: Element;
  section: Section;
  w: number;
  h: number;
  x: number;
  y: number;
}

// ---- Bin-packing: pack cards into rows within a section width ----
function binPackCards(cards: CardInfo[], sectionW: number, startX: number, startY: number): number {
  let rowX = startX;
  let rowY = startY;
  let rowMaxH = 0;

  for (const card of cards) {
    if (rowX > startX && rowX + card.w > startX + sectionW) {
      rowY += rowMaxH + CARD_GAP;
      rowX = startX;
      rowMaxH = 0;
    }
    card.x = rowX;
    card.y = rowY;
    rowX += card.w + CARD_GAP;
    rowMaxH = Math.max(rowMaxH, card.h);
  }

  return (rowY - startY) + rowMaxH;
}

// ---- Flatten all sections (including nested children) ----
function flattenSections(sections: Section[]): Section[] {
  const result: Section[] = [];
  for (const sec of sections) {
    result.push(sec);
    if (sec.children_sections?.length) {
      result.push(...flattenSections(sec.children_sections));
    }
  }
  return result;
}

// ---- Compute full layout (grid-based, matching HTML renderer) ----
interface LayoutResult {
  items: LayoutItem[];
  sectionLabels: { title: string; category: string; x: number; y: number; w: number; h: number }[];
  canvasWidth: number;
  canvasHeight: number;
}

// Preferred section ordering: project_meta first, then by category
const CATEGORY_ORDER: Record<string, number> = {
  project_meta: 0,
  system_structure: 1,
  data_layer: 2,
  api_integration: 3,
  security: 4,
  infrastructure: 5,
  processes: 6,
  user_flows: 7,
};

function computeLayout(board: Board, svgSizes: Record<string, { width: number; height: number }> = {}): LayoutResult {
  const allSections = flattenSections(board.sections).filter(s => s.elements.length > 0);

  // Sort sections: project_meta first, then by category order
  allSections.sort((a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99));

  // Build card info grouped by section (direct port of HTML renderer autoLayout)
  const sectionMap = new Map<string, CardInfo[]>();
  const sectionOrder: string[] = [];
  const sectionMeta = new Map<string, Section>();

  for (const sec of allSections) {
    const cards: CardInfo[] = [];
    for (const el of sec.elements) {
      const { w, h } = cardSize(el, svgSizes);
      cards.push({ element: el, section: sec, w, h, x: 0, y: 0 });
    }
    sectionMap.set(sec.id, cards);
    sectionOrder.push(sec.id);
    sectionMeta.set(sec.id, sec);
  }

  // Step 1: Section width = widest card. Bin-pack to get height.
  const sectionWidths = new Map<string, number>();
  const sectionHeights = new Map<string, number>();
  for (const secId of sectionOrder) {
    const secCards = sectionMap.get(secId)!;
    const maxW = Math.max(...secCards.map(c => c.w));
    sectionWidths.set(secId, maxW);
    const clones = secCards.map(c => ({ ...c }));
    const h = SECTION_LABEL_H + binPackCards(clones, maxW, 0, 0);
    sectionHeights.set(secId, h);
  }

  // Step 2: Compute row widths to find widest row
  let maxRowW = 0;
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

  // Step 3: Place sections — center each row within widest row width
  const canvasContentW = maxRowW;
  let curY = PAD;

  const items: LayoutItem[] = [];
  const sectionLabels: LayoutResult['sectionLabels'] = [];

  for (const { sections: rowSections, rowW, rowH } of rowInfos) {
    let colX = PAD + (canvasContentW - rowW) / 2;

    for (const secId of rowSections) {
      const secCards = sectionMap.get(secId)!;
      const secW = sectionWidths.get(secId)!;
      const sec = sectionMeta.get(secId)!;

      // Bin-pack cards within this section
      binPackCards(secCards, secW, colX, curY + SECTION_LABEL_H);

      // Add items
      for (const card of secCards) {
        items.push({
          element: card.element,
          section: card.section,
          pos: { x: card.x, y: card.y, w: card.w, h: card.h },
        });
      }

      // Section label bounds — use section width and computed height
      sectionLabels.push({
        title: sec.title,
        category: sec.category,
        x: colX - 10,
        y: curY - 5,
        w: secW + 20,
        h: sectionHeights.get(secId)! + 15,
      });

      colX += secW + SECTION_COL_GAP;
    }

    curY += rowH + SECTION_ROW_GAP;
  }

  // Add margins and compute canvas size
  const contentW = canvasContentW + PAD * 2;
  const contentH = curY + PAD;

  // Shift all cards and labels by margin offset
  for (const item of items) {
    item.pos.x += CANVAS_MARGIN;
    item.pos.y += CANVAS_MARGIN;
  }
  for (const label of sectionLabels) {
    label.x += CANVAS_MARGIN;
    label.y += CANVAS_MARGIN;
  }

  return {
    items,
    sectionLabels,
    canvasWidth: contentW + CANVAS_MARGIN * 2,
    canvasHeight: contentH + CANVAS_MARGIN * 2,
  };
}

export default function BoardView({ boardId, onBack }: Props) {
  const { theme, toggle: toggleTheme } = useTheme();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [canvasVisible, setCanvasVisible] = useState(false);

  // Layout state stored as mutable map for performance
  const [layoutItems, setLayoutItems] = useState<LayoutItem[]>([]);
  const [sectionLabels, setSectionLabels] = useState<LayoutResult['sectionLabels']>([]);
  const [canvasSize, setCanvasSize] = useState({ w: 2000, h: 2000 });

  const scrollToRef = useRef<((elementId: string) => void) | null>(null);
  const pendingCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Fetch board
  useEffect(() => {
    setLoading(true);
    api.getBoard(boardId)
      .then(res => {
        setBoard(res.data.board);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [boardId]);

  // Compute layout when board loads, then apply saved positions
  useEffect(() => {
    if (!board) return;

    async function buildLayout() {
      // 1. Fetch SVG sizes
      let svgSizes: Record<string, { width: number; height: number }> = {};
      try {
        const sizeRes = await api.getElementSizes(boardId);
        svgSizes = sizeRes?.data?.sizes || {};
      } catch { /* use defaults */ }

      // 2. Compute layout from sizes
      const layout = computeLayout(board, svgSizes);

      // 3. Apply saved positions if any
      try {
        const res = await api.loadLayout(boardId);
        const saved = res.data.layouts;
        if (saved && saved.length > 0) {
          const posMap = new Map(saved.map((l: any) => [l.element_id, l]));
          for (const item of layout.items) {
            const s = posMap.get(item.element.id);
            if (s) item.pos = { x: s.x, y: s.y, w: s.w, h: s.h };
          }
        }
      } catch { /* no saved layout */ }

      // 4. Apply to state
      setLayoutItems(layout.items);
      setSectionLabels(layout.sectionLabels);
      setCanvasSize({ w: layout.canvasWidth, h: layout.canvasHeight });

      // 5. Fit and reveal
      requestAnimationFrame(() => {
        fitAll(layout.canvasWidth, layout.canvasHeight);
        setTimeout(() => setCanvasVisible(true), 100);
      });
    }

    buildLayout();
  }, [board]);

  // Apply pending scroll center after React re-renders with new scale
  useEffect(() => {
    if (!pendingCenterRef.current) return;
    const { x, y } = pendingCenterRef.current;
    pendingCenterRef.current = null;
    const wrapper = document.querySelector('[data-canvas-wrapper]') as HTMLElement;
    if (!wrapper) return;
    const vw = wrapper.clientWidth;
    const vh = wrapper.clientHeight;
    wrapper.scrollLeft = x * scale - vw / 2;
    wrapper.scrollTop = y * scale - vh / 2;
  }, [scale]);

  // Fit all: compute bounding box, scale to fit, queue scroll center
  const fitAll = useCallback((_cw?: number, _ch?: number) => {
    const items = layoutItems;
    if (items.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const item of items) {
      minX = Math.min(minX, item.pos.x);
      minY = Math.min(minY, item.pos.y);
      maxX = Math.max(maxX, item.pos.x + item.pos.w);
      maxY = Math.max(maxY, item.pos.y + item.pos.h);
    }

    const margin = 40;
    const contentW = maxX - minX + margin * 2;
    const contentH = maxY - minY + margin * 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight - 44;
    const s = Math.max(0.05, Math.min(vw / contentW, vh / contentH, 1));
    const newScale = Math.round(s * 100) / 100;

    // Queue the center point so the useEffect scrolls after re-render
    pendingCenterRef.current = {
      x: minX - margin + contentW / 2,
      y: minY - margin + contentH / 2,
    };
    setScale(newScale);
  }, [layoutItems]);

  // Zoom
  const zoomIn = useCallback(() => setScale(s => Math.min(3, Math.round(s * 1.2 * 100) / 100)), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(0.05, Math.round(s / 1.2 * 100) / 100)), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (searchOpen) return; // search overlay handles its own keys
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case 'f':
        case 'F':
          fitAll();
          break;
        case '/':
          e.preventDefault();
          setSearchOpen(true);
          break;
        case 't':
        case 'T':
          toggleTheme();
          break;
        case 'e':
        case 'E':
          setEditMode(m => !m);
          break;
        case 'Escape':
          onBack();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [searchOpen, zoomIn, zoomOut, fitAll, toggleTheme, onBack]);

  // Update card position (drag)
  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {
    setLayoutItems(prev => prev.map(item =>
      item.element.id === id ? { ...item, pos: { ...item.pos, x, y } } : item
    ));
  }, []);

  // Update section label position (drag)
  const handleUpdateSectionPos = useCallback((index: number, x: number, y: number) => {
    setSectionLabels(prev => prev.map((sec, i) =>
      i === index ? { ...sec, x, y } : sec
    ));
  }, []);

  // Update card size (resize)
  const handleUpdateSize = useCallback((id: string, pos: CardPosition) => {
    setLayoutItems(prev => prev.map(item =>
      item.element.id === id ? { ...item, pos } : item
    ));
  }, []);

  // Export handlers
  const handleExport = useCallback(async (format: string) => {
    try {
      const blob = await api.exportBoard(boardId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${board?.name || 'board'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [boardId, board]);

  // Print / PDF — open board HTML in new tab for browser printing
  const handlePrintPdf = useCallback(() => {
    window.open(`/api/boards/${boardId}/export?format=pdf`, '_blank');
  }, [boardId]);

  // Save layout
  const handleSaveLayout = useCallback(async () => {
    const layouts = layoutItems.map(item => ({
      element_id: item.element.id,
      x: item.pos.x,
      y: item.pos.y,
      w: item.pos.w,
      h: item.pos.h,
    }));
    await api.saveLayout(boardId, layouts);
  }, [boardId, layoutItems]);

  // Search result selection
  const handleSearchSelect = useCallback((elementId: string) => {
    scrollToRef.current?.(elementId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
        />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <p className="text-lg mb-2" style={{ color: 'var(--fg)' }}>Failed to load board</p>
          <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>{error}</p>
          <button
            onClick={onBack}
            className="text-sm px-4 py-2 rounded-md"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Back to boards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen" style={{ background: 'var(--bg)' }}>
      <Toolbar
        title={board.name}
        subtitle={board.description}
        version={board.version}
        scale={scale}
        editMode={editMode}
        theme={theme}
        onBack={onBack}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitAll={() => fitAll()}
        onSearch={() => setSearchOpen(true)}
        onToggleTheme={toggleTheme}
        onToggleEdit={() => setEditMode(m => !m)}
        onSaveLayout={handleSaveLayout}
        onExportHtml={() => handleExport('html')}
        onPrintPdf={handlePrintPdf}
      />

      <Canvas
        boardId={boardId}
        items={layoutItems}
        sectionLabels={sectionLabels}
        scale={scale}
        editMode={editMode}
        canvasWidth={canvasSize.w}
        canvasHeight={canvasSize.h}
        visible={canvasVisible}
        onUpdatePosition={handleUpdatePosition}
        onUpdateSize={handleUpdateSize}
        onUpdateSectionPos={handleUpdateSectionPos}
        onZoom={setScale}
        scrollToRef={scrollToRef}
      />

      <SearchOverlay
        boardId={boardId}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSearchSelect}
      />
    </div>
  );
}
