import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/client';

interface SearchResult {
  element_id: string;
  name: string;
  type: string;
  section_title: string;
  match_context?: string;
}

interface Props {
  boardId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (elementId: string) => void;
}

export default function SearchOverlay({ boardId, open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchBoard(boardId, q.trim());
        setResults(res.data.results as SearchResult[]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [boardId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[15vh] z-[100]"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl border"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ color: 'var(--fg-muted)', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search elements..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--fg)' }}
          />
          <button
            onClick={onClose}
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border)',
            }}
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-auto">
          {loading && (
            <div className="px-4 py-6 text-center">
              <div
                className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
              />
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>
              No results found
            </div>
          )}

          {!loading && results.map((r, i) => (
            <button
              key={r.element_id + i}
              onClick={() => {
                onSelect(r.element_id);
                onClose();
              }}
              className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                  {r.name}
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
                  {r.section_title}
                  {r.match_context && ` - ${r.match_context}`}
                </div>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--fg-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {r.type}
              </span>
            </button>
          ))}

          {!query.trim() && !loading && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>
              Type to search elements, sections, and tags
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
