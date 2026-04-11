// Board, Section, Element — core data model from SCHEMA.md

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type SectionCategory =
  | 'system_structure'
  | 'data_layer'
  | 'api_integration'
  | 'security'
  | 'infrastructure'
  | 'user_flows'
  | 'processes'
  | 'project_meta';

export type LayoutType = 'grid' | 'horizontal' | 'vertical' | 'tree' | 'force' | 'freeform';

export type ElementType =
  | 'architecture_diagram'
  | 'db_schema'
  | 'page_map'
  | 'flow_chart'
  | 'api_map'
  | 'sequence_diagram'
  | 'file_tree'
  | 'dependency_graph'
  | 'security_layer_map'
  | 'cicd_pipeline'
  | 'environment_map'
  | 'permission_matrix'
  | 'tech_stack'
  | 'note'
  | 'text_block'
  | 'image'
  | 'badge';

export type ElementStatus = 'current' | 'stale' | 'deprecated';

export interface BoardConfig {
  auto_snapshot: boolean;
  snapshot_on_export: boolean;
  max_snapshots: number;
  default_layout: LayoutType;
  export_path: string;
}

export interface Element {
  id: string;
  type: ElementType;
  name: string;
  description: string;
  section_id: string;
  position: Position;
  size: Size;
  tags: string[];
  status: ElementStatus;
  created_at: string;
  updated_at: string;
  data: import('./elements.js').ElementData;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  category: SectionCategory;
  parent_section_id: string | null;
  position: Position;
  size: Size;
  color: string;
  collapsed: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  elements: Element[];
  children_sections: Section[];
}

export interface Board {
  id: string;
  name: string;
  description: string;
  project_path: string;
  theme: 'light' | 'dark';
  tags: string[];
  created_at: string;
  updated_at: string;
  version: number;
  sections: Section[];
  connections: import('./connections.js').Connection[];
  cross_references: import('./connections.js').CrossReference[];
  board_links: import('./connections.js').BoardLink[];
  config: BoardConfig;
}

export interface BoardIndexEntry {
  board_id: string;
  name: string;
  project_path: string;
  description: string;
  last_updated: string;
  version: number;
  element_count: number;
}

export interface BoardIndex {
  boards: BoardIndexEntry[];
}

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  auto_snapshot: true,
  snapshot_on_export: true,
  max_snapshots: 50,
  default_layout: 'grid',
  export_path: './docs',
};
