import { z } from 'zod';
import type { Board } from '../models/board.js';

// --- Reusable schemas ---

const positionSchema = z.object({ x: z.number(), y: z.number() }).optional();
const sizeSchema = z.object({ width: z.number().positive(), height: z.number().positive() }).optional();
const tagsSchema = z.array(z.string().regex(/^[a-z0-9-]+$/, 'Tags must be lowercase alphanumeric with hyphens')).optional();

const sectionCategorySchema = z.enum([
  'system_structure', 'data_layer', 'api_integration', 'security',
  'infrastructure', 'user_flows', 'processes', 'project_meta',
]);

const layoutTypeSchema = z.enum(['grid', 'horizontal', 'vertical', 'tree', 'force', 'freeform']);

const elementTypeSchema = z.enum([
  'architecture_diagram', 'db_schema', 'page_map', 'flow_chart', 'api_map',
  'sequence_diagram', 'file_tree', 'dependency_graph', 'security_layer_map',
  'cicd_pipeline', 'environment_map', 'permission_matrix', 'tech_stack',
  'note', 'text_block', 'image', 'badge',
]);

// --- Element data schemas ---

const architectureDiagramDataSchema = z.object({
  components: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['service', 'database', 'queue', 'cache', 'client', 'external', 'gateway', 'worker', 'storage', 'cdn', 'load_balancer', 'container']),
    description: z.string().optional(),
    technology: z.string().optional(),
    layer: z.string().optional(),
    metadata: z.record(z.string()).optional(),
  })),
  connections: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string().optional(),
    protocol: z.string().optional(),
    data_format: z.string().optional(),
    async: z.boolean().optional(),
    direction: z.enum(['one_way', 'bidirectional']).optional(),
  })),
  layers: z.array(z.object({
    name: z.string(),
    component_ids: z.array(z.string()),
  })).optional(),
});

const dbSchemaDataSchema = z.object({
  tables: z.array(z.object({
    id: z.string(),
    name: z.string(),
    schema: z.string().optional(),
    description: z.string().optional(),
    columns: z.array(z.object({
      name: z.string(),
      type: z.string(),
      primary_key: z.boolean().optional(),
      nullable: z.boolean().optional(),
      unique: z.boolean().optional(),
      default: z.string().optional(),
      description: z.string().optional(),
    })),
    indexes: z.array(z.object({
      name: z.string(),
      columns: z.array(z.string()),
      unique: z.boolean().optional(),
    })).optional(),
  })),
  relationships: z.array(z.object({
    from_table: z.string(),
    from_column: z.string(),
    to_table: z.string(),
    to_column: z.string(),
    type: z.enum(['one_to_one', 'one_to_many', 'many_to_one', 'many_to_many']),
    label: z.string().optional(),
  })),
});

const pageMapDataSchema = z.object({
  pages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    route: z.string(),
    description: z.string().optional(),
    type: z.enum(['page', 'modal', 'drawer', 'tab']).optional(),
    auth_required: z.boolean().optional(),
    roles: z.array(z.string()).optional(),
    components: z.array(z.string()).optional(),
  })),
  navigations: z.array(z.object({
    from: z.string(),
    to: z.string(),
    trigger: z.string(),
    condition: z.string().optional(),
  })),
});

const flowChartDataSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['start', 'end', 'process', 'decision', 'io', 'subprocess', 'delay', 'loop']),
    description: z.string().optional(),
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string().optional(),
    condition: z.string().optional(),
  })),
});

const apiMapDataSchema = z.object({
  base_url: z.string().optional(),
  groups: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    endpoints: z.array(z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'WS', 'SSE', 'GRAPHQL']),
      path: z.string(),
      description: z.string(),
      auth: z.boolean().optional(),
      request_body: z.string().optional(),
      response_body: z.string().optional(),
      status_codes: z.array(z.object({
        code: z.number(),
        description: z.string(),
      })).optional(),
    })),
  })),
});

const sequenceDiagramDataSchema = z.object({
  actors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['user', 'service', 'database', 'external', 'queue']).optional(),
  })),
  messages: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
    type: z.enum(['sync', 'async', 'response', 'self']).optional(),
    order: z.number(),
    note: z.string().optional(),
  })),
});

const fileTreeDataSchema = z.object({
  root: z.string(),
  entries: z.array(z.object({
    path: z.string(),
    type: z.enum(['file', 'directory']),
    description: z.string().optional(),
    highlight: z.boolean().optional(),
    technology: z.string().optional(),
  })),
});

const dependencyGraphDataSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['internal', 'external', 'devDependency']),
    version: z.string().optional(),
    description: z.string().optional(),
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(['imports', 'depends_on', 'peer']).optional(),
  })),
});

const securityLayerMapDataSchema = z.object({
  layers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    level: z.number(),
    description: z.string().optional(),
    technology: z.string().optional(),
    configuration: z.string().optional(),
  })),
  flows: z.array(z.object({
    name: z.string(),
    path: z.array(z.string()),
  })),
});

const cicdPipelineDataSchema = z.object({
  trigger: z.string(),
  platform: z.string().optional(),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    steps: z.array(z.object({
      name: z.string(),
      command: z.string().optional(),
      description: z.string().optional(),
    })),
    parallel: z.boolean().optional(),
    environment: z.string().optional(),
    depends_on: z.array(z.string()).optional(),
  })),
});

const environmentMapDataSchema = z.object({
  environments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    infrastructure: z.string().optional(),
    services: z.array(z.object({
      name: z.string(),
      replicas: z.number().optional(),
      resources: z.string().optional(),
    })),
    database: z.string().optional(),
    notes: z.string().optional(),
  })),
  promotions: z.array(z.object({
    from: z.string(),
    to: z.string(),
    method: z.string(),
  })),
});

const permissionMatrixDataSchema = z.object({
  roles: z.array(z.string()),
  resources: z.array(z.object({
    name: z.string(),
    permissions: z.record(z.array(z.string())),
  })),
});

const techStackDataSchema = z.object({
  categories: z.array(z.object({
    name: z.string(),
    technologies: z.array(z.object({
      name: z.string(),
      version: z.string().optional(),
      purpose: z.string(),
      url: z.string().optional(),
    })),
  })),
});

const noteDataSchema = z.object({
  content: z.string(),
  color: z.enum(['yellow', 'blue', 'green', 'pink', 'orange', 'purple']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

const textBlockDataSchema = z.object({
  content: z.string(),
});

const imageDataSchema = z.object({
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
});

const badgeDataSchema = z.object({
  label: z.string(),
  color: z.string().optional(),
  icon: z.string().optional(),
  attached_to: z.string().optional(),
});

// Map element type to its data schema
const elementDataSchemas: Record<string, z.ZodType> = {
  architecture_diagram: architectureDiagramDataSchema,
  db_schema: dbSchemaDataSchema,
  page_map: pageMapDataSchema,
  flow_chart: flowChartDataSchema,
  api_map: apiMapDataSchema,
  sequence_diagram: sequenceDiagramDataSchema,
  file_tree: fileTreeDataSchema,
  dependency_graph: dependencyGraphDataSchema,
  security_layer_map: securityLayerMapDataSchema,
  cicd_pipeline: cicdPipelineDataSchema,
  environment_map: environmentMapDataSchema,
  permission_matrix: permissionMatrixDataSchema,
  tech_stack: techStackDataSchema,
  note: noteDataSchema,
  text_block: textBlockDataSchema,
  image: imageDataSchema,
  badge: badgeDataSchema,
};

export function getElementDataSchema(type: string): z.ZodType | undefined {
  return elementDataSchemas[type];
}

// --- Tool input schemas ---

export const createBoardInputSchema = z.object({
  name: z.string().min(1),
  project_path: z.string().min(1),
  description: z.string().optional().default(''),
  theme: z.enum(['light', 'dark']).optional().default('dark'),
  tags: tagsSchema.default([]),
});

export const addSectionInputSchema = z.object({
  board_id: z.string(),
  title: z.string().min(1),
  category: sectionCategorySchema,
  description: z.string().optional().default(''),
  parent_section_id: z.string().optional(),
  position: positionSchema,
  color: z.string().optional(),
  collapsed: z.boolean().optional().default(false),
  tags: tagsSchema.default([]),
  reason: z.string().optional().default(''),
});

export const updateSectionInputSchema = z.object({
  board_id: z.string(),
  section_id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  position: positionSchema,
  color: z.string().optional(),
  collapsed: z.boolean().optional(),
  tags: tagsSchema,
  reason: z.string().optional().default(''),
});

export const removeSectionInputSchema = z.object({
  board_id: z.string(),
  section_id: z.string(),
  remove_children: z.boolean().optional().default(true),
  reason: z.string().optional().default(''),
});

export const setLayoutInputSchema = z.object({
  board_id: z.string(),
  section_id: z.string(),
  layout: layoutTypeSchema,
  spacing: z.number().positive().optional().default(40),
});

export const addElementInputSchema = z.object({
  board_id: z.string(),
  section_id: z.string(),
  type: elementTypeSchema,
  name: z.string().min(1),
  description: z.string().optional().default(''),
  position: positionSchema,
  size: sizeSchema,
  tags: tagsSchema.default([]),
  data: z.record(z.unknown()),
  reason: z.string().optional().default(''),
});

export const updateElementInputSchema = z.object({
  board_id: z.string(),
  element_id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  position: positionSchema,
  size: sizeSchema,
  tags: tagsSchema,
  data: z.record(z.unknown()).optional(),
  reason: z.string().optional().default(''),
});

export const removeElementInputSchema = z.object({
  board_id: z.string(),
  element_id: z.string(),
  reason: z.string().optional().default(''),
});

export const getElementInputSchema = z.object({
  board_id: z.string(),
  element_id: z.string(),
  include_history: z.boolean().optional().default(false),
});

export const bulkAddElementsInputSchema = z.object({
  board_id: z.string(),
  section_id: z.string(),
  elements: z.array(z.object({
    type: elementTypeSchema,
    name: z.string().min(1),
    description: z.string().optional().default(''),
    tags: tagsSchema.default([]),
    data: z.record(z.unknown()),
  })),
  reason: z.string().optional().default(''),
});

export const bulkUpdateElementsInputSchema = z.object({
  board_id: z.string(),
  updates: z.array(z.object({
    element_id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    tags: tagsSchema,
    data: z.record(z.unknown()).optional(),
  })),
  reason: z.string().optional().default(''),
});

export const addConnectionInputSchema = z.object({
  board_id: z.string(),
  from_element_id: z.string(),
  to_element_id: z.string(),
  label: z.string().optional().default(''),
  style: z.enum(['solid', 'dashed', 'dotted']).optional().default('solid'),
  color: z.string().optional(),
  arrow: z.enum(['forward', 'backward', 'both', 'none']).optional().default('forward'),
  metadata: z.object({
    protocol: z.string().optional(),
    data_format: z.string().optional(),
    async: z.boolean().optional(),
    description: z.string().optional(),
  }).optional().default({}),
  reason: z.string().optional().default(''),
});

export const updateConnectionInputSchema = z.object({
  board_id: z.string(),
  connection_id: z.string(),
  label: z.string().optional(),
  style: z.enum(['solid', 'dashed', 'dotted']).optional(),
  color: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  reason: z.string().optional().default(''),
});

export const removeConnectionInputSchema = z.object({
  board_id: z.string(),
  connection_id: z.string(),
  reason: z.string().optional().default(''),
});

export const addCrossReferenceInputSchema = z.object({
  board_id: z.string(),
  from_element_id: z.string(),
  to_element_id: z.string(),
  relationship: z.string().min(1),
  description: z.string().optional().default(''),
  bidirectional: z.boolean().optional().default(false),
  reason: z.string().optional().default(''),
});

export const addBoardLinkInputSchema = z.object({
  board_id: z.string(),
  target_board_id: z.string(),
  label: z.string().min(1),
  description: z.string().optional().default(''),
  element_id: z.string().optional(),
  reason: z.string().optional().default(''),
});

export const getHistoryInputSchema = z.object({
  board_id: z.string(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  element_id: z.string().optional(),
  section_id: z.string().optional(),
  action: z.enum(['created', 'updated', 'removed']).optional(),
  limit: z.number().positive().optional().default(50),
  offset: z.number().min(0).optional().default(0),
});

export const addMilestoneInputSchema = z.object({
  board_id: z.string(),
  name: z.string().regex(/^[a-z0-9-]+$/, 'Milestone names must be lowercase slugs'),
  description: z.string().optional().default(''),
});

export const getSnapshotInputSchema = z.object({
  board_id: z.string(),
  version: z.number().optional(),
  milestone: z.string().optional(),
});

export const compareSnapshotsInputSchema = z.object({
  board_id: z.string(),
  from_version: z.union([z.number(), z.string()]),
  to_version: z.union([z.number(), z.string()]),
});

export const addDecisionInputSchema = z.object({
  board_id: z.string(),
  title: z.string().min(1),
  context: z.string().min(1),
  decision: z.string().min(1),
  alternatives: z.array(z.string()).optional().default([]),
  consequences: z.string().optional().default(''),
  related_elements: z.array(z.string()).optional().default([]),
  status: z.enum(['proposed', 'accepted', 'superseded', 'deprecated']).optional().default('accepted'),
});

export const getDecisionsInputSchema = z.object({
  board_id: z.string(),
  status: z.string().optional(),
  element_id: z.string().optional(),
});

export const getTimelineInputSchema = z.object({
  board_id: z.string(),
  granularity: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export const searchBoardInputSchema = z.object({
  board_id: z.string(),
  query: z.string().optional(),
  type: elementTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  section_id: z.string().optional(),
  status: z.enum(['current', 'stale']).optional(),
  category: z.string().optional(),
});

export const addTagInputSchema = z.object({
  board_id: z.string(),
  element_id: z.string(),
  tags: z.array(z.string().regex(/^[a-z0-9-]+$/)),
});

export const removeTagInputSchema = z.object({
  board_id: z.string(),
  element_id: z.string(),
  tags: z.array(z.string()),
});

export const getBoardInputSchema = z.object({
  board_id: z.string(),
  include_elements: z.boolean().optional().default(true),
});

export const deleteBoardInputSchema = z.object({
  board_id: z.string(),
  confirm: z.literal(true),
});

export const exportBoardInputSchema = z.object({
  board_id: z.string(),
  format: z.enum(['html', 'markdown', 'png', 'svg', 'mermaid']),
  output_path: z.string().optional(),
  include_timeline: z.boolean().optional().default(true),
  include_minimap: z.boolean().optional().default(true),
  sections: z.array(z.string()).optional(),
});

export const getElementHistoryInputSchema = z.object({
  board_id: z.string(),
  element_id: z.string(),
});

export const boardHealthReportInputSchema = z.object({
  board_id: z.string(),
});

export const validateBoardInputSchema = z.object({
  board_id: z.string(),
});

// --- Board integrity validation ---

export interface ValidationError {
  type: string;
  message: string;
  element_id?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  element_id?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export function validateBoardIntegrity(board: Board): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Collect all IDs
  const allIds = new Set<string>();
  const elementIds = new Set<string>();
  const sectionIds = new Set<string>();

  allIds.add(board.id);

  for (const section of board.sections) {
    if (allIds.has(section.id)) {
      errors.push({ type: 'DUPLICATE_ID', message: `Duplicate ID: ${section.id}`, element_id: section.id });
    }
    allIds.add(section.id);
    sectionIds.add(section.id);

    for (const element of section.elements) {
      if (allIds.has(element.id)) {
        errors.push({ type: 'DUPLICATE_ID', message: `Duplicate ID: ${element.id}`, element_id: element.id });
      }
      allIds.add(element.id);
      elementIds.add(element.id);

      // Validate element references its section
      if (element.section_id !== section.id) {
        errors.push({
          type: 'INVALID_SECTION_REF',
          message: `Element ${element.id} has section_id ${element.section_id} but is in section ${section.id}`,
          element_id: element.id,
        });
      }

      // Validate positions/sizes are non-negative
      if (element.position.x < 0 || element.position.y < 0) {
        warnings.push({ type: 'NEGATIVE_POSITION', message: `Element ${element.id} has negative position`, element_id: element.id });
      }
      if (element.size.width < 0 || element.size.height < 0) {
        errors.push({ type: 'NEGATIVE_SIZE', message: `Element ${element.id} has negative size`, element_id: element.id });
      }

      // Validate tags format
      for (const tag of element.tags) {
        if (!/^[a-z0-9-]+$/.test(tag)) {
          errors.push({ type: 'INVALID_TAG', message: `Invalid tag "${tag}" on element ${element.id}`, element_id: element.id });
        }
      }
    }

    // Validate parent_section_id references
    if (section.parent_section_id !== null && !sectionIds.has(section.parent_section_id)) {
      // Note: this may be valid if sections are processed in order and parent comes later.
      // We do a second pass below.
    }
  }

  // Second pass: validate parent_section_id
  for (const section of board.sections) {
    if (section.parent_section_id !== null && !sectionIds.has(section.parent_section_id)) {
      errors.push({
        type: 'INVALID_PARENT_SECTION',
        message: `Section ${section.id} references non-existent parent ${section.parent_section_id}`,
      });
    }
  }

  // Check for circular nesting
  for (const section of board.sections) {
    const visited = new Set<string>();
    let current: string | null = section.id;
    while (current) {
      if (visited.has(current)) {
        errors.push({ type: 'CIRCULAR_NESTING', message: `Circular section nesting detected involving ${section.id}` });
        break;
      }
      visited.add(current);
      const parent = board.sections.find(s => s.id === current);
      current = parent?.parent_section_id ?? null;
    }
  }

  // Validate connections reference existing elements
  for (const conn of board.connections) {
    if (!elementIds.has(conn.from_element_id)) {
      errors.push({ type: 'BROKEN_CONNECTION', message: `Connection ${conn.id} references non-existent element ${conn.from_element_id}` });
    }
    if (!elementIds.has(conn.to_element_id)) {
      errors.push({ type: 'BROKEN_CONNECTION', message: `Connection ${conn.id} references non-existent element ${conn.to_element_id}` });
    }
  }

  // Validate cross-references
  for (const ref of board.cross_references) {
    if (!elementIds.has(ref.from_element_id)) {
      errors.push({ type: 'BROKEN_CROSS_REF', message: `Cross-reference ${ref.id} references non-existent element ${ref.from_element_id}` });
    }
    if (!elementIds.has(ref.to_element_id)) {
      errors.push({ type: 'BROKEN_CROSS_REF', message: `Cross-reference ${ref.id} references non-existent element ${ref.to_element_id}` });
    }
  }

  // Validate version is positive
  if (board.version < 1) {
    errors.push({ type: 'INVALID_VERSION', message: `Board version must be >= 1, got ${board.version}` });
  }

  return { valid: errors.length === 0, errors, warnings };
}
