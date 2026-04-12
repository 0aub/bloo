import React, { useRef, useCallback, useState } from 'react';
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
  scrollToRef,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{ startX: number; startY: number; scrollX: number; scrollY: number } | null>(null);

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
            data-canvas-bg="true"
            className="absolute rounded-lg pointer-events-none"
            style={{
              left: sec.x,
              top: sec.y,
              width: sec.w,
              height: sec.h,
              border: '1px dashed var(--border)',
              background: 'transparent',
            }}
          >
            <div
              className="absolute -top-6 left-3 text-xs font-semibold px-2 py-0.5 rounded"
              style={{
                color: 'var(--fg-muted)',
                background: 'var(--bg)',
              }}
            >
              {sec.title}
              {sec.category && (
                <span className="ml-2 opacity-50">{sec.category}</span>
              )}
            </div>
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
