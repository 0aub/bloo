import { useState, useEffect } from 'react';
import { api, type Project, type BoardIndex } from '../api/client';
import { useTheme } from '../hooks/useTheme';

interface Props {
  onSelectBoard: (boardId: string) => void;
}

export default function Dashboard({ onSelectBoard }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<BoardIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const { theme, toggle: toggleTheme } = useTheme();

  const loadProjects = () => {
    api.listProjects()
      .then(res => { setProjects(res.data.projects); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadProjects(); }, []);

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    api.listBoards(project.id).then(res => setBoards(res.data.boards));
  };

  const addProject = async () => {
    if (!newProjectName.trim() || !newProjectPath.trim()) return;
    await api.createProject({ name: newProjectName.trim(), path: newProjectPath.trim() });
    setNewProjectName('');
    setNewProjectPath('');
    setShowAddProject(false);
    loadProjects();
  };

  const deleteProject = async (id: string) => {
    await api.deleteProject(id);
    if (selectedProject?.id === id) { setSelectedProject(null); setBoards([]); }
    loadProjects();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold" style={{ background: 'linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Bloo
          </h1>
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Blueprint your code</span>
        </div>
        <button onClick={toggleTheme} className="p-2 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        </button>
      </header>

      <div className="flex" style={{ height: 'calc(100vh - 57px)' }}>
        {/* Sidebar: Projects */}
        <aside className="w-72 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>Projects</span>
            <button onClick={() => setShowAddProject(true)} className="w-7 h-7 flex items-center justify-center rounded-md text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--accent)' }}>+</button>
          </div>

          {showAddProject && (
            <div className="p-3 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name" className="px-3 py-1.5 rounded-md text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
              <input value={newProjectPath} onChange={e => setNewProjectPath(e.target.value)} placeholder="/projects/my-project" className="px-3 py-1.5 rounded-md text-sm font-mono" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
              <div className="flex gap-2">
                <button onClick={addProject} className="flex-1 py-1 rounded-md text-xs font-semibold" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Add</button>
                <button onClick={() => setShowAddProject(false)} className="flex-1 py-1 rounded-md text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {projects.length === 0 && !showAddProject && (
              <div className="p-4 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>
                No projects yet.<br/>Click + to add one.
              </div>
            )}
            {projects.map(p => (
              <div key={p.id} onClick={() => selectProject(p)} className="flex items-center justify-between px-4 py-3 cursor-pointer" style={{ background: selectedProject?.id === p.id ? 'var(--bg-elevated)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--fg-muted)' }}>{p.path}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }} className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--fg-muted)' }} title="Delete project">×</button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main: Boards */}
        <main className="flex-1 overflow-y-auto p-8">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--fg-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4" style={{ opacity: 0.3 }}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
              <p className="text-lg font-medium mb-1">Select a project</p>
              <p className="text-sm">Choose a project from the sidebar to view its boards</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{selectedProject.name}</h2>
                <p className="text-sm font-mono" style={{ color: 'var(--fg-muted)' }}>{selectedProject.path}</p>
              </div>

              {boards.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
                  <p className="text-lg mb-2">No boards yet</p>
                  <p className="text-sm">Use Claude Code to document this project with Bloo MCP tools</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {boards.map(b => (
                    <div key={b.board_id} onClick={() => onSelectBoard(b.board_id)} className="p-5 rounded-xl cursor-pointer transition-all hover:scale-[1.02]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <h3 className="font-semibold mb-1">{b.name}</h3>
                      <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>{b.description}</p>
                      <div className="flex gap-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        <span>{b.element_count} elements</span>
                        <span>v{b.version}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
