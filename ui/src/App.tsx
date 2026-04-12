import { useState, useEffect } from 'react';
import BoardList from './pages/BoardList';
import BoardView from './pages/BoardView';

export default function App() {
  const [boardId, setBoardId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('board');
  });

  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      setBoardId(params.get('board'));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (id: string | null) => {
    const url = id ? `?board=${id}` : window.location.pathname;
    window.history.pushState({}, '', url);
    setBoardId(id);
  };

  if (boardId) {
    return <BoardView boardId={boardId} onBack={() => navigate(null)} />;
  }
  return <BoardList onSelect={(id) => navigate(id)} />;
}
