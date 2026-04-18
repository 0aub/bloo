import React from 'react';

interface Props {
  title: string;
  subtitle: string;
  version?: number;
  scale: number;
  editMode: boolean;
  theme: 'dark' | 'light';
  onBack?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
  onSearch: () => void;
  onToggleTheme: () => void;
  onToggleEdit: () => void;
  onSaveLayout: () => void;
  onExportHtml: () => void;
  onPrintPdf: () => void;
}

function IconButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center w-7 h-7 rounded-md"
      style={{
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--fg-muted)',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = 'var(--bg-elevated)';
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function Separator() {
  return (
    <div
      className="w-px h-5 mx-1"
      style={{ background: 'var(--border)' }}
    />
  );
}

// Inline SVG icons (Lucide-style, 18x18)
const Icons = {
  ZoomOut: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  ZoomIn: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  Maximize: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  Search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Sun: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Edit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Save: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Download: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  FileText: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  ArrowLeft: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
};

export default function Toolbar({
  title,
  subtitle,
  version,
  scale,
  editMode,
  theme,
  onBack,
  onZoomIn,
  onZoomOut,
  onFitAll,
  onSearch,
  onToggleTheme,
  onToggleEdit,
  onSaveLayout,
  onExportHtml,
  onPrintPdf,
}: Props) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-2 select-none shrink-0"
      style={{
        background: theme === 'dark' ? 'hsl(160 10% 8% / 0.95)' : 'hsl(150 10% 97% / 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 100,
        height: 44,
      }}
    >
      {/* Back button */}
      {onBack && (
        <IconButton onClick={onBack} title="Back (Esc)">
          {Icons.ArrowLeft}
        </IconButton>
      )}

      {/* Left: title */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span
          className="text-base font-extrabold truncate leading-tight"
          style={{
            background: 'linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className="text-xs truncate leading-tight"
            style={{ color: 'var(--fg-muted)' }}
          >
            {subtitle}
          </span>
        )}
        {version != null && (
          <span
            className="text-[11px] font-mono"
            style={{ color: 'var(--fg-muted)' }}
          >
            v{version}
          </span>
        )}
      </div>

      {/* Zoom display */}
      <span
        className="text-[11px] font-mono"
        style={{ color: 'var(--fg-muted)', minWidth: 36, textAlign: 'center' }}
      >
        {Math.round(scale * 100)}%
      </span>

      {/* Toolbar button group */}
      <div
        className="flex items-center gap-0.5"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 2,
        }}
      >
        <IconButton onClick={onZoomOut} title="Zoom out (-)">
          {Icons.ZoomOut}
        </IconButton>
        <IconButton onClick={onZoomIn} title="Zoom in (+)">
          {Icons.ZoomIn}
        </IconButton>
        <IconButton onClick={onFitAll} title="Fit all (F)">
          {Icons.Maximize}
        </IconButton>

        <Separator />

        <IconButton onClick={onSearch} title="Search (/)">
          {Icons.Search}
        </IconButton>
        <IconButton onClick={onToggleTheme} title="Toggle theme (T)">
          {theme === 'dark' ? Icons.Sun : Icons.Moon}
        </IconButton>
        <IconButton onClick={() => { if (editMode) { onSaveLayout(); } onToggleEdit(); }} title={editMode ? 'Save & exit edit (E)' : 'Edit mode (E)'} active={editMode}>
          {editMode ? Icons.Save : Icons.Edit}
        </IconButton>

        <Separator />

        <IconButton onClick={onExportHtml} title="Export as HTML">
          {Icons.Download}
        </IconButton>
        <IconButton onClick={onPrintPdf} title="Print / PDF">
          {Icons.FileText}
        </IconButton>
      </div>
    </div>
  );
}

export { Icons, IconButton };
