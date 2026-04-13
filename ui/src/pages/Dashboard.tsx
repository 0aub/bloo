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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <img src="/logo.png" alt="Bloo" style={{ width: 48, height: 48, opacity: 0.5, animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  // Welcome — no projects
  if (projects.length === 0 && !showAddModal) {
    return (
      <div className="h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, hsl(152 65% 55% / 0.04) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, hsl(155 65% 30% / 0.06) 0%, transparent 70%)' }} />
        </div>

        {/* Top right controls */}
        <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', gap: 8, zIndex: 2 }}>
          <a href="https://github.com/0aub/bloo" target="_blank" rel="noopener" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--fg-muted)' }}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <button onClick={toggleTheme} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg-muted)', cursor: 'pointer', padding: '6px 10px', fontSize: 14, display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center h-full relative" style={{ zIndex: 1 }}>
          <img src="/logo.png" alt="Bloo" style={{ width: 96, height: 96, marginBottom: 28, filter: 'drop-shadow(0 0 20px hsl(152 65% 55% / 0.2))' }} />
          <h1 style={{ fontSize: 44, fontWeight: 400, marginBottom: 6, letterSpacing: 4, fontFamily: "'Fredoka', sans-serif", background: 'linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            bloo
          </h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: 16, marginBottom: 48, letterSpacing: 0.5 }}>Blueprint your code</p>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'hsl(155 50% 25%)',
              color: 'hsl(152 65% 70%)', border: '1px solid hsl(152 40% 30%)',
              padding: '14px 40px', borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 16px hsl(152 65% 45% / 0.15)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px hsl(152 65% 45% / 0.25)'; e.currentTarget.style.background = 'hsl(155 50% 28%)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px hsl(152 65% 45% / 0.15)'; e.currentTarget.style.background = 'hsl(155 50% 25%)'; }}
          >
            + Add Your First Project
          </button>
        </div>

        {renderAddModal()}
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="h-screen flex" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Sidebar */}
      <aside
        className="shrink-0 flex flex-col"
        style={{
          width: sidebarCollapsed ? 56 : 240,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-card)',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Logo area */}
        <div className="flex flex-col items-center py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <img src="/logo.png" alt="Bloo" style={{ width: sidebarCollapsed ? 28 : 44, height: sidebarCollapsed ? 28 : 44, transition: 'all 0.2s' }} />
          {!sidebarCollapsed && (
            <span style={{ fontSize: 20, fontWeight: 400, marginTop: 8, letterSpacing: 3, fontFamily: "'Fredoka', sans-serif", background: 'linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              bloo
            </span>
          )}
        </div>

        {/* Projects header + add button */}
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--fg-muted)' }}>Projects</span>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1, opacity: 0.6, transition: 'opacity 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
              title="Add project"
            >+</button>
          </div>
        )}

        {/* Project list */}
        <div className="flex-1 overflow-y-auto">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => selectProject(p)}
              title={sidebarCollapsed ? p.name : undefined}
              style={{
                padding: sidebarCollapsed ? '10px 0' : '10px 14px',
                cursor: 'pointer',
                borderLeft: selectedProject?.id === p.id ? '3px solid var(--accent)' : '3px solid transparent',
                background: selectedProject?.id === p.id ? 'var(--bg-elevated)' : 'transparent',
                transition: 'all 0.1s',
                textAlign: sidebarCollapsed ? 'center' : 'left',
              }}
            >
              {sidebarCollapsed ? (
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name[0]}</div>
              ) : (
                <div className="flex items-center justify-between">
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontWeight: selectedProject?.id === p.id ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  </div>
                  <button
                    onClick={e => deleteProject(p.id, e)}
                    style={{ opacity: 0, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                  >×</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom: theme + github */}
        <div className="flex items-center justify-center gap-2 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </button>
          <a href="https://github.com/0aub/bloo" target="_blank" rel="noopener" style={{ color: 'var(--fg-muted)', display: 'flex', padding: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(c => !c)}
          style={{
            position: 'absolute', top: '50%', right: -8, transform: 'translateY(-50%)',
            width: 16, height: 32, borderRadius: '0 6px 6px 0',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: 'none',
            backdropFilter: 'blur(8px)',
            color: 'var(--fg-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, zIndex: 50,
            opacity: 0.6, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center h-full relative">
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '10%', right: '5%', width: '30vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(circle, hsl(152 65% 55% / 0.03) 0%, transparent 70%)' }} />
            </div>

            <div className="relative text-center" style={{ color: 'var(--fg-muted)' }}>
              <img src="/logo.png" alt="" style={{ width: 56, height: 56, opacity: 0.12, margin: '0 auto 20px' }} />
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: 'var(--fg)' }}>Select a project</p>
              <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 320 }}>
                Choose a project from the sidebar to view its documentation boards
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8">
            {boards.length === 0 ? (
              <div className="flex flex-col items-center py-20" style={{ color: 'var(--fg-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.2, marginBottom: 20 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                </svg>
                <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, color: 'var(--fg)' }}>No boards yet</p>
                <p style={{ fontSize: 13, maxWidth: 440, textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
                  Add this to your Claude Code MCP settings, then ask Claude to document this project:
                </p>

                <div style={{
                  padding: '16px 20px', borderRadius: 10, width: 420, maxWidth: '90%',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  position: 'relative',
                }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--fg-muted)' }}>Claude Code MCP Config</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify({ mcpServers: { bloo: { url: "http://localhost:3000/mcp/sse" } } }, null, 2));
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 2, opacity: 0.5, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                      title="Copy to clipboard"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                  </div>
                  <pre style={{
                    fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)',
                    background: 'var(--bg-elevated)', padding: 12, borderRadius: 6,
                    overflow: 'auto', lineHeight: 1.5, margin: 0,
                  }}>{`{
  "mcpServers": {
    "bloo": {
      "url": "http://localhost:3000/mcp/sse"
    }
  }
}`}</pre>
                  <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 10, lineHeight: 1.6 }}>
                    Then tell Claude: <em style={{ color: 'var(--fg)' }}>"Document this project using Bloo"</em>
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{boards.length} board{boards.length !== 1 ? 's' : ''}</div>
                </div>
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
              </div>
            )}
          </div>
        )}
      </main>

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
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 }}>Select a project folder</label>
            <FolderBrowser onSelect={(selectedPath, folderName) => {
              setNewPath(selectedPath);
              setNewName(folderName);
            }} />
          </div>

          {newPath && (
            <div className="mb-4" style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderLeftWidth: 3 }}>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 2 }}>Selected</div>
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
                background: newPath && newName ? 'hsl(155 50% 25%)' : 'var(--bg-elevated)',
                color: newPath && newName ? 'hsl(152 65% 70%)' : 'var(--fg-muted)',
                fontSize: 13, fontWeight: 600,
                cursor: newPath && newName ? 'pointer' : 'not-allowed',
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
