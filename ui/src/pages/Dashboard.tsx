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
    // Auto-select the new project
    if (res.data.project) selectProject(res.data.project);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its boards?')) return;
    await api.deleteProject(id);
    if (selectedProject?.id === id) { setSelectedProject(null); setBoards([]); }
    loadProjects();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <img src="/logo.png" alt="Bloo" style={{ width: 48, height: 48, opacity: 0.5, animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  // No projects yet — show welcome screen
  if (projects.length === 0 && !showAddModal) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 8 }}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>

        <img src="/logo.png" alt="Bloo" style={{ width: 80, height: 80, marginBottom: 24, opacity: 0.9 }} />
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, background: 'linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Bloo
        </h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 40 }}>Blueprint your code</p>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'linear-gradient(135deg, hsl(155 65% 30%), hsl(152 65% 45%))',
            color: 'white', border: 'none', padding: '12px 32px', borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px hsl(152 65% 45% / 0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
          + Add Your First Project
        </button>
        <p style={{ color: 'var(--fg-muted)', fontSize: 12, marginTop: 16, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          Register a project directory, then use Claude Code with Bloo's MCP tools to generate visual documentation.
        </p>

        {renderAddModal()}
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Bloo" style={{ width: 28, height: 28 }} />
          <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Bloo
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Project
          </button>
          <button onClick={toggleTheme} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg-muted)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 14 }}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 flex flex-col overflow-y-auto" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--fg-muted)' }}>Projects</span>
          </div>
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => selectProject(p)}
              className="group"
              style={{
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                borderLeft: selectedProject?.id === p.id ? '3px solid var(--accent)' : '3px solid transparent',
                background: selectedProject?.id === p.id ? 'var(--bg-elevated)' : 'transparent',
                transition: 'all 0.1s',
              }}
            >
              <div className="flex items-center justify-between">
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <button
                  onClick={e => deleteProject(p.id, e)}
                  style={{ opacity: 0, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, transition: 'opacity 0.15s' }}
                  className="group-hover:!opacity-100"
                  title="Delete"
                >×</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono, monospace)', marginTop: 2 }}>{p.path}</div>
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--fg-muted)' }}>
              <img src="/logo.png" alt="" style={{ width: 48, height: 48, opacity: 0.15, marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 500 }}>Select a project</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Choose from the sidebar or add a new one</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>{selectedProject.name}</h2>
                <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--fg-muted)', marginTop: 4 }}>{selectedProject.path}</p>
              </div>

              {boards.length === 0 ? (
                <div className="flex flex-col items-center py-16" style={{ color: 'var(--fg-muted)' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-elevated)', border: '1px dashed var(--border)', marginBottom: 16, fontSize: 24
                  }}>📋</div>
                  <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No boards yet</p>
                  <p style={{ fontSize: 13, maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
                    Connect Claude Code to Bloo and ask it to document this project. It will create boards with architecture diagrams, database schemas, flow charts, and more.
                  </p>
                  <div style={{
                    marginTop: 20, padding: '10px 16px', borderRadius: 8,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
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
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px hsl(152 65% 45% / 0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{b.name}</div>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                        {b.description?.slice(0, 120)}{b.description && b.description.length > 120 ? '...' : ''}
                      </p>
                      <div className="flex gap-4" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{b.element_count} elements</span>
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

      {renderAddModal()}
    </div>
  );

  function renderAddModal() {
    if (!showAddModal) return null;
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100 }}
        onClick={() => setShowAddModal(false)}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 32, width: 420, maxWidth: '90vw',
            boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="" style={{ width: 24, height: 24 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Add Project</h3>
          </div>

          <div className="mb-4">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}>Project Name</label>
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="My Project"
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--fg)', fontSize: 14, outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <div className="mb-6">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}>Project Path</label>
            <input
              value={newPath} onChange={e => setNewPath(e.target.value)}
              placeholder="/projects/my-project"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--fg)', fontSize: 14, fontFamily: 'monospace', outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              onKeyDown={e => e.key === 'Enter' && addProject()}
            />
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>
              Path inside the Docker container (mounted via volumes)
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={addProject}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, hsl(155 65% 30%), hsl(152 65% 45%))',
                color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Add Project
            </button>
            <button
              onClick={() => setShowAddModal(false)}
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
