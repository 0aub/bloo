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

// ---- Layout constants ----
const CARD_MIN_W = 320;
const CARD_DEFAULT_H = 280;
const CARD_GAP = 16;
const SECTION_PAD = 30;
const SECTION_LABEL_H = 40;
const SECTIONS_PER_ROW = 3;
const SECTION_GAP = 40;
const CANVAS_MARGIN = 300;

// ---- Bin-packing: pack cards into rows within a section width ----
function binPackCards(
  elements: Element[],
  sectionWidth: number,
): { positions: Map<string, CardPosition>; totalHeight: number } {
  const positions = new Map<string, CardPosition>();
  let rowX = 0;
  let rowY = 0;
  let rowMaxH = 0;

  for (const el of elements) {
    const w = Math.min(el.size?.width || CARD_MIN_W, sectionWidth - SECTION_PAD * 2);
    const h = el.size?.height || CARD_DEFAULT_H;

    if (rowX + w > sectionWidth - SECTION_PAD * 2 && rowX > 0) {
      // Wrap to next row
      rowY += rowMaxH + CARD_GAP;
      rowX = 0;
      rowMaxH = 0;
    }

    positions.set(el.id, { x: rowX, y: rowY, w, h });
    rowX += w + CARD_GAP;
    rowMaxH = Math.max(rowMaxH, h);
  }

  return { positions, totalHeight: rowY + rowMaxH };
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

// ---- Compute full layout ----
interface LayoutResult {
  items: LayoutItem[];
  sectionLabels: { title: string; category: string; x: number; y: number; w: number; h: number }[];
  canvasWidth: number;
  canvasHeight: number;
}

function computeLayout(board: Board): LayoutResult {
  const allSections = flattenSections(board.sections).filter(s => s.elements.length > 0);
  const items: LayoutItem[] = [];
  const sectionLabels: LayoutResult['sectionLabels'] = [];

  // Compute section widths
  const sectionContentWidth = Math.max(
    CARD_MIN_W + SECTION_PAD * 2,
    ...allSections.map(sec => {
      const maxCardW = Math.max(...sec.elements.map(el => el.size?.width || CARD_MIN_W));
      return maxCardW + SECTION_PAD * 2;
    }),
  );

  // Lay out sections in rows of SECTIONS_PER_ROW
  const sectionBoxes: { section: Section; width: number; height: number }[] = [];

  for (const sec of allSections) {
    const { positions, totalHeight } = binPackCards(sec.elements, sectionContentWidth);
    const h = SECTION_LABEL_H + totalHeight + SECTION_PAD * 2;
    sectionBoxes.push({ section: sec, width: sectionContentWidth, height: h });
  }

  // Arrange in rows of 3
  let globalY = CANVAS_MARGIN;
  const rows: typeof sectionBoxes[][] = [];
  for (let i = 0; i < sectionBoxes.length; i += SECTIONS_PER_ROW) {
    rows.push(sectionBoxes.slice(i, i + SECTIONS_PER_ROW));
  }

  let maxRowWidth = 0;

  for (const row of rows) {
    const rowWidth = row.reduce((sum, sb) => sum + sb.width, 0) + (row.length - 1) * SECTION_GAP;
    maxRowWidth = Math.max(maxRowWidth, rowWidth);
  }

  for (const row of rows) {
    const rowWidth = row.reduce((sum, sb) => sum + sb.width, 0) + (row.length - 1) * SECTION_GAP;
    // Center the row
    let rowX = CANVAS_MARGIN + (maxRowWidth - rowWidth) / 2;
    const rowMaxH = Math.max(...row.map(sb => sb.height));

    for (const sb of row) {
      const sec = sb.section;

      // Section label box
      sectionLabels.push({
        title: sec.title,
        category: sec.category,
        x: rowX,
        y: globalY,
        w: sb.width,
        h: sb.height,
      });

      // Pack cards inside section
      const { positions } = binPackCards(sec.elements, sb.width);
      for (const el of sec.elements) {
        const cardPos = positions.get(el.id);
        if (!cardPos) continue;
        items.push({
          element: el,
          section: sec,
          pos: {
            x: rowX + SECTION_PAD + cardPos.x,
            y: globalY + SECTION_LABEL_H + SECTION_PAD + cardPos.y,
            w: cardPos.w,
            h: cardPos.h,
          },
        });
      }

      rowX += sb.width + SECTION_GAP;
    }

    globalY += rowMaxH + SECTION_GAP;
  }

  const canvasWidth = maxRowWidth + CANVAS_MARGIN * 2;
  const canvasHeight = globalY + CANVAS_MARGIN;

  return { items, sectionLabels, canvasWidth, canvasHeight };
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
    const layout = computeLayout(board);

    // Try to load saved layout and override positions
    api.loadLayout(boardId).then(res => {
      const saved = res.data.layouts;
      if (saved && saved.length > 0) {
        const posMap = new Map(saved.map(l => [l.element_id, l]));
        for (const item of layout.items) {
          const s = posMap.get(item.element.id);
          if (s) {
            item.pos = { x: s.x, y: s.y, w: s.w, h: s.h };
          }
        }
      }
      setLayoutItems(layout.items);
      setSectionLabels(layout.sectionLabels);
      setCanvasSize({ w: layout.canvasWidth, h: layout.canvasHeight });
    }).catch(() => {
      // No saved layout, use computed
      setLayoutItems(layout.items);
      setSectionLabels(layout.sectionLabels);
      setCanvasSize({ w: layout.canvasWidth, h: layout.canvasHeight });
    });

    // Fit all on initial load, then fade in
    requestAnimationFrame(() => {
      fitAll(layout.canvasWidth, layout.canvasHeight);
      setTimeout(() => setCanvasVisible(true), 50);
    });
  }, [board]);

  // Fit all: compute scale to fit canvas in viewport
  const fitAll = useCallback((cw?: number, ch?: number) => {
    const w = cw || canvasSize.w;
    const h = ch || canvasSize.h;
    const vw = window.innerWidth;
    const vh = window.innerHeight - 48; // toolbar height
    const s = Math.min(vw / w, vh / h, 1);
    setScale(Math.max(0.1, Math.round(s * 100) / 100));
  }, [canvasSize]);

  // Zoom
  const zoomIn = useCallback(() => setScale(s => Math.min(3, Math.round((s + 0.1) * 100) / 100)), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(0.1, Math.round((s - 0.1) * 100) / 100)), []);

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
        scale={scale}
        editMode={editMode}
        theme={theme}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitAll={() => fitAll()}
        onSearch={() => setSearchOpen(true)}
        onToggleTheme={toggleTheme}
        onToggleEdit={() => setEditMode(m => !m)}
        onSaveLayout={handleSaveLayout}
        onExportHtml={() => handleExport('html')}
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
