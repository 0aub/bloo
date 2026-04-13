import { useState, useEffect } from 'react';
import { api, type Project, type BoardIndex } from '../api/client';
import { useTheme } from '../hooks/useTheme';
import FolderBrowser from '../components/FolderBrowser';

interface Props {
  onSelectBoard: (boardId: string) => void;
}

export default function Dashboard({ onSelectBoard }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<BoardIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
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
    if (!newName.trim() || !newPath.trim()) return;
    const res = await api.createProject({ name: newName.trim(), path: newPath.trim() });
    setNewName(''); setNewPath(''); setShowAddModal(false);
    loadProjects();
    if (res.data.project) selectProject(res.data.project);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its boards?')) return;
    await api.deleteProject(id);
    if (selectedProject?.id === id) { setSelectedProject(null); setBoards([]); }
    loadProjects();
  };

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <img src="/logo.png" alt="Bloo" style={{ width: 48, height: 48, opacity: 0.5, animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  // Welcome screen — no projects yet
  if (projects.length === 0 && !showAddModal) {
    return (
      <div className="h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        {/* Background decoration */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, hsl(152 65% 55% / 0.04) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, hsl(155 65% 30% / 0.06) 0%, transparent 70%)' }} />
        </div>

        <div style={{ position: 'absolute', top: 20, right: 24 }}>
          <button onClick={toggleTheme} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg-muted)', cursor: 'pointer', padding: '6px 10px', fontSize: 14 }}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>

        <div className="flex flex-col items-center justify-center h-full relative" style={{ zIndex: 1 }}>
          <img src="/logo.png" alt="Bloo" style={{ width: 96, height: 96, marginBottom: 28, filter: 'drop-shadow(0 0 20px hsl(152 65% 55% / 0.2))' }} />

          <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 6, background: 'linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Bloo
          </h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: 16, marginBottom: 48, letterSpacing: 0.5 }}>Blueprint your code</p>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'linear-gradient(135deg, hsl(155 65% 30%), hsl(152 65% 45%))',
              color: 'white', border: 'none', padding: '14px 40px', borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 16px hsl(152 65% 45% / 0.2)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px hsl(152 65% 45% / 0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px hsl(152 65% 45% / 0.2)'; }}
          >
            + Add Your First Project
          </button>

          <p style={{ color: 'var(--fg-muted)', fontSize: 11, marginTop: 48, opacity: 0.4 }}>
            Open source • github.com/0aub/bloo
          </p>
        </div>

        {renderAddModal()}
      </div>
    );
  }

  // Main dashboard with projects
  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Bloo" style={{ width: 24, height: 24 }} />
          <span style={{ fontSize: 15, fontWeight: 800, background: 'linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Bloo
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            + New Project
          </button>
          <button onClick={toggleTheme} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg-muted)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--fg-muted)' }}>Projects</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => selectProject(p)}
                className="group"
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderLeft: selectedProject?.id === p.id ? '3px solid var(--accent)' : '3px solid transparent',
                  background: selectedProject?.id === p.id ? 'var(--bg-elevated)' : 'transparent',
                  transition: 'all 0.1s',
                }}
              >
                <div className="flex items-center justify-between">
                  <div style={{ fontSize: 13, fontWeight: selectedProject?.id === p.id ? 700 : 500 }}>{p.name}</div>
                  <button
                    onClick={e => deleteProject(p.id, e)}
                    style={{ opacity: 0, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, transition: 'opacity 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    title="Remove"
                  >×</button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.path}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {!selectedProject ? (
            /* No project selected */
            <div className="flex flex-col items-center justify-center h-full relative">
              {/* Subtle background */}
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '10%', right: '5%', width: '30vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(circle, hsl(152 65% 55% / 0.03) 0%, transparent 70%)' }} />
              </div>

              <div className="relative text-center" style={{ color: 'var(--fg-muted)' }}>
                <img src="/logo.png" alt="" style={{ width: 56, height: 56, opacity: 0.12, margin: '0 auto 20px' }} />
                <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: 'var(--fg)' }}>Select a project</p>
                <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 320 }}>
                  Choose a project from the sidebar to view its documentation boards
                </p>

                <div style={{ marginTop: 32, padding: '16px 24px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'inline-block', textAlign: 'left' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--fg-muted)', marginBottom: 8 }}>Quick start</div>
                  <div style={{ fontSize: 12, lineHeight: 2 }}>
                    <div><span style={{ color: 'var(--accent)' }}>1.</span> Select a project from the sidebar</div>
                    <div><span style={{ color: 'var(--accent)' }}>2.</span> Connect Claude Code via MCP</div>
                    <div><span style={{ color: 'var(--accent)' }}>3.</span> Ask Claude to document your project</div>
                  </div>
                  <div style={{ marginTop: 12, padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 10, fontFamily: 'monospace', color: 'var(--accent)' }}>
                    MCP: http://localhost:3000/mcp/sse
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Project selected — show boards */
            <div className="p-8">
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800 }}>{selectedProject.name}</h2>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--fg-muted)', marginTop: 3 }}>{selectedProject.path}</p>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                  {boards.length} board{boards.length !== 1 ? 's' : ''}
                </div>
              </div>

              {boards.length === 0 ? (
                <div className="flex flex-col items-center py-20" style={{ color: 'var(--fg-muted)' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-card)', border: '2px dashed var(--border)', marginBottom: 20, fontSize: 28
                  }}>📋</div>
                  <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, color: 'var(--fg)' }}>No boards yet</p>
                  <p style={{ fontSize: 13, maxWidth: 380, textAlign: 'center', lineHeight: 1.7 }}>
                    Connect Claude Code to Bloo and ask it to document this project.
                    It will create boards with architecture diagrams, database schemas, flow charts, and more.
                  </p>
                  <div style={{
                    marginTop: 24, padding: '10px 16px', borderRadius: 8,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)',
                  }}>
                    MCP: http://localhost:3000/mcp/sse
                  </div>
                </div>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {boards.map(b => (
                    <div
                      key={b.board_id}
                      onClick={() => onSelectBoard(b.board_id)}
                      style={{
                        padding: 20, borderRadius: 12, cursor: 'pointer',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px hsl(152 65% 45% / 0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{b.name}</div>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                        {b.description?.slice(0, 120)}{b.description && b.description.length > 120 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-4" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{b.element_count} elements</span>
                        <span>v{b.version}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {renderAddModal()}
    </div>
  );

  function renderAddModal() {
    if (!showAddModal) return null;
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100 }}
        onClick={() => { setShowAddModal(false); setNewName(''); setNewPath(''); }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 28, width: 520, maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <img src="/logo.png" alt="" style={{ width: 22, height: 22 }} />
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>Add Project</h3>
          </div>

          <div className="mb-4">
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 }}>Browse and select a project folder</label>
            <FolderBrowser onSelect={(selectedPath, folderName) => {
              setNewPath(selectedPath);
              if (!newName) setNewName(folderName);
            }} />
          </div>

          {newPath && (
            <div className="mb-4" style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderLeftWidth: 3 }}>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 2 }}>Selected path</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)' }}>{newPath}</div>
            </div>
          )}

          <div className="mb-5">
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 }}>Project name</label>
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="My Project"
              style={{
                width: '100%', padding: '9px 14px', borderRadius: 8,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--fg)', fontSize: 14, outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              onKeyDown={e => e.key === 'Enter' && addProject()}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={addProject}
              disabled={!newPath || !newName}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: newPath && newName ? 'linear-gradient(135deg, hsl(155 65% 30%), hsl(152 65% 45%))' : 'var(--bg-elevated)',
                color: newPath && newName ? 'white' : 'var(--fg-muted)',
                fontSize: 13, fontWeight: 600,
                cursor: newPath && newName ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              Add Project
            </button>
            <button
              onClick={() => { setShowAddModal(false); setNewName(''); setNewPath(''); }}
              style={{
                padding: '10px 20px', borderRadius: 8,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--fg)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }
}
