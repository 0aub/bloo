import React, { useRef, useCallback, useState, useEffect } from 'react';
import Card, { type CardPosition } from './Card';
import { type Section, type Element } from '../api/client';

export interface LayoutItem {
  element: Element;
  section: Section;
  pos: CardPosition;
}

interface SectionLabel {
  title: string;
  category: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  boardId: string;
  items: LayoutItem[];
  sectionLabels: SectionLabel[];
  scale: number;
  editMode: boolean;
  canvasWidth: number;
  canvasHeight: number;
  visible: boolean;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateSize: (id: string, pos: CardPosition) => void;
  onUpdateSectionPos: (index: number, x: number, y: number) => void;
  onZoom: (newScale: number) => void;
  scrollToRef: React.MutableRefObject<((elementId: string) => void) | null>;
}

export default function Canvas({
  boardId,
  items,
  sectionLabels,
  scale,
  editMode,
  canvasWidth,
  canvasHeight,
  visible,
  onUpdatePosition,
  onUpdateSize,
  onUpdateSectionPos,
  onZoom,
  scrollToRef,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{ startX: number; startY: number; scrollX: number; scrollY: number } | null>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  // Pending scroll target after zoom — applied in a layout effect
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

  // After React re-renders with new scale, apply the deferred scroll
  useEffect(() => {
    if (pendingScrollRef.current && wrapperRef.current) {
      wrapperRef.current.scrollLeft = pendingScrollRef.current.left;
      wrapperRef.current.scrollTop = pendingScrollRef.current.top;
      pendingScrollRef.current = null;
    }
  }, [scale]);

  // Ctrl+Scroll wheel zoom (toward cursor position) — stable listener
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const curScale = scaleRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(3, Math.max(0.05, Math.round(curScale * factor * 100) / 100));
      if (newScale === curScale) return;

      // Compute cursor position in canvas space (unscaled)
      const rect = wrapper.getBoundingClientRect();
      const cursorViewX = e.clientX - rect.left;
      const cursorViewY = e.clientY - rect.top;
      const canvasX = (wrapper.scrollLeft + cursorViewX) / curScale;
      const canvasY = (wrapper.scrollTop + cursorViewY) / curScale;

      // Defer scroll to after React re-renders with new spacer size
      pendingScrollRef.current = {
        left: canvasX * newScale - cursorViewX,
        top: canvasY * newScale - cursorViewY,
      };

      onZoomRef.current(newScale);
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []); // stable — no deps, uses refs

  // Pan by dragging background
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan when clicking directly on the canvas background
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.canvasBg) return;
    e.preventDefault();
    setPanning(true);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollX: wrapperRef.current?.scrollLeft ?? 0,
      scrollY: wrapperRef.current?.scrollTop ?? 0,
    };

    const handlePanMove = (ev: MouseEvent) => {
      if (!panRef.current || !wrapperRef.current) return;
      const dx = ev.clientX - panRef.current.startX;
      const dy = ev.clientY - panRef.current.startY;
      wrapperRef.current.scrollLeft = panRef.current.scrollX - dx;
      wrapperRef.current.scrollTop = panRef.current.scrollY - dy;
    };

    const handlePanEnd = () => {
      setPanning(false);
      panRef.current = null;
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', handlePanEnd);
    };

    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
  }, []);

  // Scroll to a specific element
  scrollToRef.current = (elementId: string) => {
    const item = items.find(it => it.element.id === elementId);
    if (!item || !wrapperRef.current) return;
    const wrapper = wrapperRef.current;
    const targetX = item.pos.x * scale - wrapper.clientWidth / 2 + (item.pos.w * scale) / 2;
    const targetY = item.pos.y * scale - wrapper.clientHeight / 2 + (item.pos.h * scale) / 2;
    wrapper.scrollTo({ left: targetX, top: targetY, behavior: 'smooth' });

    // Flash highlight
    const el = wrapper.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
    if (el) {
      el.style.outline = '2px solid var(--accent)';
      el.style.outlineOffset = '2px';
      setTimeout(() => {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }, 1500);
    }
  };

  return (
    <div
      ref={wrapperRef}
      data-canvas-wrapper="true"
      className="flex-1 overflow-auto relative"
      style={{
        cursor: panning ? 'grabbing' : 'grab',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease-in-out',
      }}
    >
      {/* Spacer div that defines the scrollable area at the scaled size */}
      <div
        data-canvas-bg="true"
        onMouseDown={handleMouseDown}
        style={{
          width: canvasWidth * scale,
          height: canvasHeight * scale,
          position: 'relative',
        }}
      >
        {/* Inner div at natural size, visually scaled via transform */}
        <div
          data-canvas-bg="true"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
        {/* Section labels */}
        {sectionLabels.map((sec, i) => (
          <div
            key={i}
            data-canvas-bg={editMode ? undefined : "true"}
            className="absolute"
            style={{
              left: sec.x,
              top: sec.y,
              width: sec.w,
              height: sec.h,
              border: editMode ? '1.5px dashed var(--border-hover)' : '1.5px dashed var(--border)',
              borderRadius: 12,
              background: 'hsl(152 65% 55% / 0.02)',
              padding: '8px 14px',
              pointerEvents: editMode ? 'auto' : 'none',
              cursor: editMode ? 'grab' : 'default',
              transition: 'border-color 0.15s',
            }}
            onMouseDown={editMode ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const origX = sec.x;
              const origY = sec.y;
              const curScale = scaleRef.current;

              const onMove = (ev: MouseEvent) => {
                const dx = (ev.clientX - startX) / curScale;
                const dy = (ev.clientY - startY) / curScale;
                onUpdateSectionPos(i, origX + dx, origY + dy);
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            } : undefined}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: 'var(--fg-muted)',
                opacity: 0.6,
                whiteSpace: 'nowrap',
              }}
            >
              {sec.title}
            </span>
          </div>
        ))}

        {/* Cards */}
        {items.map(item => (
          <Card
            key={item.element.id}
            boardId={boardId}
            element={item.element}
            pos={item.pos}
            editMode={editMode}
            scale={scale}
            onMove={onUpdatePosition}
            onResize={(id, p) => onUpdateSize(id, p)}
          />
        ))}
        </div>
      </div>
    </div>
  );
}
