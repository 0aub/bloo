// Per-type element data interfaces from SCHEMA.md / TOOLS.md

// --- Architecture Diagram ---

export interface ArchitectureComponent {
  id: string;
  name: string;
  type: 'service' | 'database' | 'queue' | 'cache' | 'client' | 'external' | 'gateway' | 'worker' | 'storage' | 'cdn' | 'load_balancer' | 'container';
  description?: string;
  technology?: string;
  layer?: string;
  metadata?: Record<string, string>;
}

export interface ArchitectureConnection {
  from: string;
  to: string;
  label?: string;
  protocol?: string;
  data_format?: string;
  async?: boolean;
  direction?: 'one_way' | 'bidirectional';
}

export interface ArchitectureLayer {
  name: string;
  component_ids: string[];
}

export interface ArchitectureDiagramData {
  components: ArchitectureComponent[];
  connections: ArchitectureConnection[];
  layers?: ArchitectureLayer[];
}

// --- DB Schema ---

export interface DbColumn {
  name: string;
  type: string;
  primary_key?: boolean;
  nullable?: boolean;
  unique?: boolean;
  default?: string;
  description?: string;
}

export interface DbIndex {
  name: string;
  columns: string[];
  unique?: boolean;
}

export interface DbTable {
  id: string;
  name: string;
  schema?: string;
  description?: string;
  columns: DbColumn[];
  indexes?: DbIndex[];
}

export interface DbRelationship {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
  label?: string;
}

export interface DbSchemaData {
  tables: DbTable[];
  relationships: DbRelationship[];
}

// --- Page Map ---

export interface PageEntry {
  id: string;
  name: string;
  route: string;
  description?: string;
  type?: 'page' | 'modal' | 'drawer' | 'tab';
  auth_required?: boolean;
  roles?: string[];
  components?: string[];
}

export interface PageNavigation {
  from: string;
  to: string;
  trigger: string;
  condition?: string;
}

export interface PageMapData {
  pages: PageEntry[];
  navigations: PageNavigation[];
}

// --- Flow Chart ---

export interface FlowNode {
  id: string;
  name: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'io' | 'subprocess' | 'delay' | 'loop';
  description?: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  condition?: string;
}

export interface FlowChartData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// --- API Map ---

export interface ApiStatusCode {
  code: number;
  description: string;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'WS' | 'SSE' | 'GRAPHQL';
  path: string;
  description: string;
  auth?: boolean;
  request_body?: string;
  response_body?: string;
  status_codes?: ApiStatusCode[];
}

export interface ApiGroup {
  name: string;
  description?: string;
  endpoints: ApiEndpoint[];
}

export interface ApiMapData {
  base_url?: string;
  groups: ApiGroup[];
}

// --- Sequence Diagram ---

export interface SequenceActor {
  id: string;
  name: string;
  type?: 'user' | 'service' | 'database' | 'external' | 'queue';
}

export interface SequenceMessage {
  from: string;
  to: string;
  label: string;
  type?: 'sync' | 'async' | 'response' | 'self';
  order: number;
  note?: string;
}

export interface SequenceDiagramData {
  actors: SequenceActor[];
  messages: SequenceMessage[];
}

// --- File Tree ---

export interface FileEntry {
  path: string;
  type: 'file' | 'directory';
  description?: string;
  highlight?: boolean;
  technology?: string;
}

export interface FileTreeData {
  root: string;
  entries: FileEntry[];
}

// --- Dependency Graph ---

export interface DependencyNode {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'devDependency';
  version?: string;
  description?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type?: 'imports' | 'depends_on' | 'peer';
}

export interface DependencyGraphData {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

// --- Security Layer Map ---

export interface SecurityLayer {
  id: string;
  name: string;
  level: number;
  description?: string;
  technology?: string;
  configuration?: string;
}

export interface SecurityFlow {
  name: string;
  path: string[];
}

export interface SecurityLayerMapData {
  layers: SecurityLayer[];
  flows: SecurityFlow[];
}

// --- CI/CD Pipeline ---

export interface PipelineStep {
  name: string;
  command?: string;
  description?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  steps: PipelineStep[];
  parallel?: boolean;
  environment?: string;
  depends_on?: string[];
}

export interface CicdPipelineData {
  trigger: string;
  platform?: string;
  stages: PipelineStage[];
}

// --- Environment Map ---

export interface EnvironmentService {
  name: string;
  replicas?: number;
  resources?: string;
}

export interface Environment {
  id: string;
  name: string;
  url?: string;
  infrastructure?: string;
  services: EnvironmentService[];
  database?: string;
  notes?: string;
}

export interface EnvironmentPromotion {
  from: string;
  to: string;
  method: string;
}

export interface EnvironmentMapData {
  environments: Environment[];
  promotions: EnvironmentPromotion[];
}

// --- Permission Matrix ---

export interface PermissionResource {
  name: string;
  permissions: Record<string, string[]>;
}

export interface PermissionMatrixData {
  roles: string[];
  resources: PermissionResource[];
}

// --- Tech Stack ---

export interface Technology {
  name: string;
  version?: string;
  purpose: string;
  url?: string;
}

export interface TechCategory {
  name: string;
  technologies: Technology[];
}

export interface TechStackData {
  categories: TechCategory[];
}

// --- Note ---

export interface NoteData {
  content: string;
  color?: 'yellow' | 'blue' | 'green' | 'pink' | 'orange' | 'purple';
  priority?: 'low' | 'medium' | 'high';
}

// --- Text Block ---

export interface TextBlockData {
  content: string;
}

// --- Image ---

export interface ImageData {
  src: string;
  alt: string;
  caption?: string;
}

// --- Badge ---

export interface BadgeData {
  label: string;
  color?: string;
  icon?: string;
  attached_to?: string;
}

// --- Discriminated Union ---

export type ElementData =
  | ArchitectureDiagramData
  | DbSchemaData
  | PageMapData
  | FlowChartData
  | ApiMapData
  | SequenceDiagramData
  | FileTreeData
  | DependencyGraphData
  | SecurityLayerMapData
  | CicdPipelineData
  | EnvironmentMapData
  | PermissionMatrixData
  | TechStackData
  | NoteData
  | TextBlockData
  | ImageData
  | BadgeData;
