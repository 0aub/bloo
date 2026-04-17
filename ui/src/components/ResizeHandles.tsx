import React from 'react';

export type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface Props {
  onResizeStart: (dir: ResizeDir, e: React.MouseEvent) => void;
}

const HANDLE_SIZE = 16;
const BRACKET_LEN = 24;
const BRACKET_THICK = 3;

interface HandleDef {
  dir: ResizeDir;
  cursor: string;
  style: React.CSSProperties;
  bracket?: React.CSSProperties[];
}

const handles: HandleDef[] = [
  // Corners with L-bracket visuals
  {
    dir: 'nw',
    cursor: 'nwse-resize',
    style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE },
    bracket: [
      { position: 'absolute', top: 0, left: 0, width: BRACKET_LEN, height: BRACKET_THICK, background: 'var(--accent)' },
      { position: 'absolute', top: 0, left: 0, width: BRACKET_THICK, height: BRACKET_LEN, background: 'var(--accent)' },
    ],
  },
  {
    dir: 'ne',
    cursor: 'nesw-resize',
    style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE },
    bracket: [
      { position: 'absolute', top: 0, right: 0, width: BRACKET_LEN, height: BRACKET_THICK, background: 'var(--accent)' },
      { position: 'absolute', top: 0, right: 0, width: BRACKET_THICK, height: BRACKET_LEN, background: 'var(--accent)' },
    ],
  },
  {
    dir: 'se',
    cursor: 'nwse-resize',
    style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE },
    bracket: [
      { position: 'absolute', bottom: 0, right: 0, width: BRACKET_LEN, height: BRACKET_THICK, background: 'var(--accent)' },
      { position: 'absolute', bottom: 0, right: 0, width: BRACKET_THICK, height: BRACKET_LEN, background: 'var(--accent)' },
    ],
  },
  {
    dir: 'sw',
    cursor: 'nesw-resize',
    style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE },
    bracket: [
      { position: 'absolute', bottom: 0, left: 0, width: BRACKET_LEN, height: BRACKET_THICK, background: 'var(--accent)' },
      { position: 'absolute', bottom: 0, left: 0, width: BRACKET_THICK, height: BRACKET_LEN, background: 'var(--accent)' },
    ],
  },
  // Side midpoint bars
  {
    dir: 'n',
    cursor: 'ns-resize',
    style: { top: -4, left: '50%', transform: 'translateX(-50%)', width: 36, height: 8 },
  },
  {
    dir: 's',
    cursor: 'ns-resize',
    style: { bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 36, height: 8 },
  },
  {
    dir: 'w',
    cursor: 'ew-resize',
    style: { left: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 36 },
  },
  {
    dir: 'e',
    cursor: 'ew-resize',
    style: { right: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 36 },
  },
];

export default function ResizeHandles({ onResizeStart }: Props) {
  return (
    <>
      {handles.map(h => (
        <div
          key={h.dir}
          onMouseDown={e => {
            e.stopPropagation();
            onResizeStart(h.dir, e);
          }}
          style={{
            position: 'absolute',
            cursor: h.cursor,
            zIndex: 20,
            ...h.style,
          }}
        >
          {h.bracket ? (
            h.bracket.map((bs, i) => <div key={i} style={bs} />)
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 2,
                background: 'var(--accent)',
                opacity: 0.7,
              }}
            />
          )}
        </div>
      ))}
    </>
  );
}
