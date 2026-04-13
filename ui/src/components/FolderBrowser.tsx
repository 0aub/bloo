import { useState, useEffect } from 'react';
import { api, type FsEntry } from '../api/client';

interface Props {
  onSelect: (path: string, name: string) => void;
}

interface TreeNode extends FsEntry {
  expanded: boolean;
  children: TreeNode[] | null; // null = not loaded yet
  loading: boolean;
}

export default function FolderBrowser({ onSelect }: Props) {
  const [rootPath, setRootPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDir = async (dirPath?: string) => {
    setLoading(true);
    try {
      const res = await api.listDirectory(dirPath);
      setRootPath(res.data.path);
      setParentPath(res.data.parent);
      setEntries(res.data.entries.map(e => ({
        ...e, expanded: false, children: null, loading: false,
      })));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadDir(); }, []);

  const toggleExpand = async (node: TreeNode) => {
    if (!node.hasChildren && !node.isProject) return;

    if (node.expanded) {
      // Collapse
      setEntries(prev => updateNode(prev, node.path, { expanded: false }));
      return;
    }

    // Expand — load children if needed
    if (node.children === null) {
      setEntries(prev => updateNode(prev, node.path, { loading: true }));
      try {
        const res = await api.listDirectory(node.path);
        const children: TreeNode[] = res.data.entries.map(e => ({
          ...e, expanded: false, children: null, loading: false,
        }));
        setEntries(prev => updateNode(prev, node.path, { children, expanded: true, loading: false }));
      } catch {
        setEntries(prev => updateNode(prev, node.path, { loading: false }));
      }
    } else {
      setEntries(prev => updateNode(prev, node.path, { expanded: true }));
    }
  };

  const handleSelect = (node: TreeNode) => {
    setSelectedPath(node.path);
    onSelect(node.path, node.name);
  };

  const navigateUp = () => {
    if (parentPath) loadDir(parentPath);
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', height: 300 }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
        {parentPath && (
          <button onClick={navigateUp} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }} title="Go up">←</button>
        )}
        <span style={{ fontFamily: 'monospace', color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rootPath}
        </span>
      </div>

      {/* Tree */}
      <div style={{ overflowY: 'auto', height: 'calc(100% - 36px)', padding: '4px 0' }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>No folders found</div>
        ) : (
          <TreeList nodes={entries} depth={0} selectedPath={selectedPath} onToggle={toggleExpand} onSelect={handleSelect} />
        )}
      </div>
    </div>
  );
}

function TreeList({ nodes, depth, selectedPath, onToggle, onSelect }: {
  nodes: TreeNode[];
  depth: number;
  selectedPath: string | null;
  onToggle: (node: TreeNode) => void;
  onSelect: (node: TreeNode) => void;
}) {
  return (
    <>
      {nodes.map(node => (
        <div key={node.path}>
          <div
            className="group flex items-center gap-1 px-2 py-1 cursor-pointer"
            style={{
              paddingLeft: 8 + depth * 16,
              background: selectedPath === node.path ? 'var(--accent)' : 'transparent',
              color: selectedPath === node.path ? 'var(--bg)' : 'var(--fg)',
              borderRadius: 4,
              margin: '1px 4px',
              transition: 'background 0.1s',
            }}
            onClick={() => onSelect(node)}
            onDoubleClick={() => onToggle(node)}
          >
            {/* Chevron */}
            <span
              onClick={e => { e.stopPropagation(); onToggle(node); }}
              style={{
                width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, flexShrink: 0, transition: 'transform 0.15s',
                transform: node.expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                opacity: (node.hasChildren || node.isProject) ? 0.6 : 0,
              }}
            >▶</span>

            {/* Folder icon */}
            <span style={{ fontSize: 14, flexShrink: 0 }}>
              {node.loading ? '⏳' : node.expanded ? '📂' : '📁'}
            </span>

            {/* Name */}
            <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.name}
            </span>

            {/* Project badge */}
            {node.isProject && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                background: selectedPath === node.path ? 'rgba(255,255,255,0.2)' : 'hsl(152 65% 55% / 0.12)',
                color: selectedPath === node.path ? 'white' : 'var(--accent)',
                flexShrink: 0,
              }}>
                PROJECT
              </span>
            )}
          </div>

          {/* Children */}
          {node.expanded && node.children && (
            <TreeList nodes={node.children} depth={depth + 1} selectedPath={selectedPath} onToggle={onToggle} onSelect={onSelect} />
          )}
        </div>
      ))}
    </>
  );
}

function updateNode(nodes: TreeNode[], targetPath: string, updates: Partial<TreeNode>): TreeNode[] {
  return nodes.map(node => {
    if (node.path === targetPath) {
      return { ...node, ...updates };
    }
    if (node.children) {
      return { ...node, children: updateNode(node.children, targetPath, updates) };
    }
    return node;
  });
}
