const BASE = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export interface BoardIndex {
  board_id: string;
  name: string;
  project_path: string;
  description: string;
  last_updated: string;
  version: number;
  element_count: number;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  project_path: string;
  theme: 'light' | 'dark';
  tags: string[];
  version: number;
  sections: Section[];
  connections: any[];
  cross_references: any[];
  board_links: any[];
  config: any;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  category: string;
  parent_section_id: string | null;
  elements: Element[];
  children_sections: Section[];
  tags: string[];
}

export interface Element {
  id: string;
  type: string;
  name: string;
  description: string;
  section_id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  tags: string[];
  status: string;
  data: any;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

export const api = {
  // Projects
  listProjects: () => request<{ success: boolean; data: { projects: Project[] } }>('/api/projects'),
  createProject: (data: { name: string; path: string }) =>
    request<{ success: boolean; data: { project: Project } }>('/api/projects', {
      method: 'POST', body: JSON.stringify(data),
    }),
  getProject: (id: string) =>
    request<{ success: boolean; data: { project: Project; boards: BoardIndex[] } }>(`/api/projects/${id}`),
  deleteProject: (id: string) =>
    request<{ success: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  // Boards
  listBoards: (projectId?: string) =>
    request<{ success: boolean; data: { boards: BoardIndex[] } }>(`/api/boards${projectId ? `?project_id=${projectId}` : ''}`),
  getBoard: (id: string) => request<{ success: boolean; data: { board: Board; stats: any } }>(`/api/boards/${id}`),
  getSvg: (boardId: string, elementId: string) =>
    fetch(`/api/boards/${boardId}/render/${elementId}`).then(r => r.text()),
  exportBoard: (id: string, format: string) =>
    fetch(`/api/boards/${id}/export?format=${format}`).then(r => r.blob()),
  searchBoard: (id: string, query: string) =>
    request<{ success: boolean; data: { results: any[] } }>(`/api/boards/${id}/search`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
};
