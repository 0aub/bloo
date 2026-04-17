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
  const [selected, setSelected] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
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

  // SVG node interactivity — wire up hover/click highlighting
  useEffect(() => {
    const container = svgRef.current;
    if (!container || !svgContent) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    const nodes = svg.querySelectorAll('[data-node-id]');
    const connections = svg.querySelectorAll('[data-conn-from]');
    if (nodes.length === 0) return;

    let lockedNodeId: string | null = null;

    function highlightNode(targetId: string) {
      // Dim all nodes and connections
      nodes.forEach(n => {
        n.classList.add('hoverable');
        n.classList.add('dimmed');
        n.classList.remove('highlighted-node');
      });
      connections.forEach(c => {
        c.classList.add('dimmed');
        c.classList.remove('highlighted-conn');
      });

      // Undim and highlight target node
      const target = svg!.querySelector(`[data-node-id="${targetId}"]`);
      if (target) {
        target.classList.remove('dimmed');
        target.classList.add('highlighted-node');
      }

      // Undim and highlight connected connections and their endpoints
      connections.forEach(c => {
        const from = c.getAttribute('data-conn-from');
        const to = c.getAttribute('data-conn-to');
        if (from === targetId || to === targetId) {
          c.classList.remove('dimmed');
          c.classList.add('highlighted-conn');
          // Undim the other endpoint
          const otherId = from === targetId ? to : from;
          const other = svg!.querySelector(`[data-node-id="${otherId}"]`);
          if (other) other.classList.remove('dimmed');
        }
      });
    }

    function clearHighlight() {
      nodes.forEach(n => {
        n.classList.remove('dimmed', 'highlighted-node');
      });
      connections.forEach(c => {
        c.classList.remove('dimmed', 'highlighted-conn');
      });
    }

    function handleEnter(e: Event) {
      if (lockedNodeId) return;
      const id = (e.currentTarget as HTMLElement).getAttribute('data-node-id');
      if (id) highlightNode(id);
    }

    function handleLeave() {
      if (lockedNodeId) return;
      clearHighlight();
    }

    function handleClick(e: Event) {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-node-id');
      if (!id) return;
      if (lockedNodeId === id) {
        lockedNodeId = null;
        clearHighlight();
      } else {
        lockedNodeId = id;
        highlightNode(id);
      }
    }

    // Attach listeners
    nodes.forEach(n => {
      n.classList.add('hoverable');
      n.addEventListener('mouseenter', handleEnter);
      n.addEventListener('mouseleave', handleLeave);
      n.addEventListener('click', handleClick);
    });

    // Click on SVG background clears lock
    function handleBgClick() {
      if (lockedNodeId) {
        lockedNodeId = null;
        clearHighlight();
      }
    }
    svg.addEventListener('click', handleBgClick);

    return () => {
      nodes.forEach(n => {
        n.removeEventListener('mouseenter', handleEnter);
        n.removeEventListener('mouseleave', handleLeave);
        n.removeEventListener('click', handleClick);
      });
      svg.removeEventListener('click', handleBgClick);
    };
  }, [svgContent]);

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
      className="absolute border overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
        background: 'var(--bg-card)',
        borderRadius: 10,
        borderColor: hovered ? 'var(--accent)' : 'var(--border)',
        boxShadow: hovered
          ? '0 4px 24px -4px hsl(152 65% 55% / 0.12)'
          : '0 1px 4px rgba(0,0,0,0.1)',
        cursor: editMode ? 'grab' : 'default',
        zIndex: hovered ? 5 : 1,
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); if (!editMode) setSelected(false); }}
      onClick={(e) => {
        if (editMode && !dragRef.current) {
          e.stopPropagation();
          setSelected(s => !s);
        }
      }}
      onMouseDown={handleDragStart}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between select-none"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          padding: '8px 12px',
          minHeight: 34,
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="font-semibold truncate"
            style={{ color: 'var(--fg)', fontSize: 12 }}
          >
            {element.name}
          </span>
          {element.status && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: statusColor }}
              title={element.status}
            />
          )}
        </div>
        <span
          className="flex-shrink-0"
          style={{
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--accent)',
            background: 'hsl(152 65% 55% / 0.08)',
            padding: '1px 6px',
            borderRadius: 4,
            marginLeft: 8,
          }}
        >
          {element.type.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: 10, height: `calc(100% - 34px${element.description && !isNote && !isText ? ' - 20px' : ''})`, overflow: 'hidden' }}>
        {/* Description */}
        {element.description && !isNote && !isText && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {element.description}
          </div>
        )}
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
            ref={svgRef}
            className="svg-body"
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

      {/* Resize handles — shown on click (selected), not hover */}
      {editMode && selected && (
        <ResizeHandles onResizeStart={handleResizeStart} />
      )}
    </div>
  );
}
