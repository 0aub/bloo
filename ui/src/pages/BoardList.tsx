import { useState, useEffect } from 'react';
import { api, type BoardIndex } from '../api/client';

interface Props {
  onSelect: (id: string) => void;
}

export default function BoardList({ onSelect }: Props) {
  const [boards, setBoards] = useState<BoardIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listBoards()
      .then(res => setBoards(res.data.boards))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg mb-2" style={{ color: 'var(--fg)' }}>Failed to load boards</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Bloo</h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            {boards.length} board{boards.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <button
              key={board.board_id}
              onClick={() => onSelect(board.board_id)}
              className="text-left rounded-lg p-5 transition-all duration-200 hover:scale-[1.02] cursor-pointer border"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <h2 className="text-base font-bold mb-1 truncate" style={{ color: 'var(--fg)' }}>
                {board.name}
              </h2>
              <p
                className="text-xs mb-3 line-clamp-2"
                style={{ color: 'var(--fg-muted)', minHeight: '2rem' }}
              >
                {board.description || 'No description'}
              </p>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--fg-muted)' }}>
                <span>{board.element_count} element{board.element_count !== 1 ? 's' : ''}</span>
                <span>{new Date(board.last_updated).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
