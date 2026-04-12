import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, type Element } from '../api/client';
import ResizeHandles, { type ResizeDir } from './ResizeHandles';
import NoteCard from './NoteCard';
import TextBlockCard from './TextBlockCard';

export interface CardPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  boardId: string;
  element: Element;
  pos: CardPosition;
  editMode: boolean;
  scale: number;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, pos: CardPosition) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#3b82f6',
  deprecated: '#6b7280',
};

const TYPE_COLORS: Record<string, string> = {
  diagram: 'var(--accent)',
  chart: '#3b82f6',
  graph: '#a855f7',
  note: '#eab308',
  text: 'var(--fg-muted)',
  table: '#f97316',
  code: '#ec4899',
};

export default function Card({ boardId, element, pos, editMode, scale, onMove, onResize }: Props) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgLoading, setSvgLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ dir: ResizeDir; startX: number; startY: number; orig: CardPosition } | null>(null);

  const isNote = element.type === 'note';
  const isText = element.type === 'text' || element.type === 'text_block';

  // Fetch SVG for non-note, non-text elements
  useEffect(() => {
    if (isNote || isText) return;
    setSvgLoading(true);
    api.getSvg(boardId, element.id)
      .then(svg => setSvgContent(svg))
      .catch(() => setSvgContent(null))
      .finally(() => setSvgLoading(false));
  }, [boardId, element.id, isNote, isText]);

  // Drag handling
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };

    const handleDragMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / scale;
      const dy = (ev.clientY - dragRef.current.startY) / scale;
      onMove(element.id, dragRef.current.origX + dx, dragRef.current.origY + dy);
    };

    const handleDragEnd = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }, [editMode, pos.x, pos.y, scale, element.id, onMove]);

  // Resize handling
  const handleResizeStart = useCallback((dir: ResizeDir, e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...pos },
    };

    const handleResizeMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const { dir: d, startX, startY, orig } = resizeRef.current;
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;

      let { x, y, w, h } = orig;
      const MIN_W = 100;
      const MIN_H = 60;

      if (d.includes('e')) w = Math.max(MIN_W, orig.w + dx);
      if (d.includes('w')) {
        const newW = Math.max(MIN_W, orig.w - dx);
        x = orig.x + (orig.w - newW);
        w = newW;
      }
      if (d.includes('s')) h = Math.max(MIN_H, orig.h + dy);
      if (d.includes('n')) {
        const newH = Math.max(MIN_H, orig.h - dy);
        y = orig.y + (orig.h - newH);
        h = newH;
      }

      onResize(element.id, { x, y, w, h });
    };

    const handleResizeEnd = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }, [editMode, pos, scale, element.id, onResize]);

  const typeColor = TYPE_COLORS[element.type] || 'var(--fg-muted)';
  const statusColor = STATUS_COLORS[element.status] || 'var(--fg-muted)';

  return (
    <div
      ref={cardRef}
      data-element-id={element.id}
      className="absolute rounded-lg border overflow-hidden transition-shadow duration-200"
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
        background: 'var(--bg-card)',
        borderColor: hovered && editMode ? 'var(--accent)' : 'var(--border)',
        boxShadow: hovered
          ? '0 8px 30px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.15)',
        cursor: editMode ? 'grab' : 'default',
        zIndex: hovered ? 10 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleDragStart}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold select-none"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          color: 'var(--fg)',
        }}
      >
        {/* Status dot */}
        {element.status && (
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: statusColor }}
            title={element.status}
          />
        )}
        <span className="truncate flex-1">{element.name}</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 uppercase tracking-wider"
          style={{
            background: `${typeColor}22`,
            color: typeColor,
            border: `1px solid ${typeColor}44`,
          }}
        >
          {element.type}
        </span>
      </div>

      {/* Body */}
      <div className="p-2 overflow-hidden" style={{ height: 'calc(100% - 30px)' }}>
        {isNote ? (
          <NoteCard
            content={element.data?.content || element.description || ''}
            color={element.data?.color}
            priority={element.data?.priority}
          />
        ) : isText ? (
          <TextBlockCard content={element.data?.content || element.description || ''} />
        ) : svgLoading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
            />
          </div>
        ) : svgContent ? (
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div
            className="flex items-center justify-center h-full text-xs"
            style={{ color: 'var(--fg-muted)' }}
          >
            No preview available
          </div>
        )}
      </div>

      {/* Resize handles */}
      {editMode && hovered && (
        <ResizeHandles onResizeStart={handleResizeStart} />
      )}
    </div>
  );
}
