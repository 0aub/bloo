# Bloo Data Schema

This is the single source of truth for the board data model. Both the MCP server and the HTML renderer depend on this schema.

---

## Board (Root Object)

```typescript
interface Board {
  id: string                      // "board_a1b2c3"
  name: string
  description: string
  project_path: string            // Absolute path to project root
  theme: "light" | "dark"
  tags: string[]

  created_at: string              // ISO 8601
  updated_at: string              // ISO 8601
  version: number                 // Current snapshot version, auto-incremented

  sections: Section[]
  connections: Connection[]
  cross_references: CrossReference[]
  board_links: BoardLink[]

  config: BoardConfig
}

interface BoardConfig {
  auto_snapshot: boolean
  snapshot_on_export: boolean
  max_snapshots: number
  default_layout: LayoutType
  export_path: string
}
```

---

## Section

```typescript
interface Section {
  id: string                      // "sec_x1y2z3"
  title: string
  description: string
  category: SectionCategory
  parent_section_id: string | null  // For nested sub-sections
  position: Position
  size: Size
  color: string                   // Hex color
  collapsed: boolean
  tags: string[]

  created_at: string
  updated_at: string

  elements: Element[]
  children_sections: Section[]    // Nested sub-sections (populated by resolver, not stored flat)
}

type SectionCategory =
  | "system_structure"
  | "data_layer"
  | "api_integration"
  | "security"
  | "infrastructure"
  | "user_flows"
  | "processes"
  | "project_meta"

type LayoutType = "grid" | "horizontal" | "vertical" | "tree" | "force" | "freeform"
```

---

## Element

```typescript
interface Element {
  id: string                      // "el_m1n2o3"
  type: ElementType
  name: string
  description: string
  section_id: string              // Parent section
  position: Position
  size: Size
  tags: string[]
  status: "current" | "stale" | "deprecated"

  created_at: string
  updated_at: string

  data: ElementData               // Type-specific data (union type, see TOOLS.md)
}

type ElementType =
  | "architecture_diagram"
  | "db_schema"
  | "page_map"
  | "flow_chart"
  | "api_map"
  | "sequence_diagram"
  | "file_tree"
  | "dependency_graph"
  | "security_layer_map"
  | "cicd_pipeline"
  | "environment_map"
  | "permission_matrix"
  | "tech_stack"
  | "note"
  | "text_block"
  | "image"
  | "badge"

// ElementData is a discriminated union — the shape depends on `type`.
// See TOOLS.md for the full data shape of each element type.
type ElementData =
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
  | BadgeData
```

---

## Connection

```typescript
interface Connection {
  id: string                      // "conn_p1q2r3"
  from_element_id: string
  to_element_id: string
  label: string
  style: "solid" | "dashed" | "dotted"
  color: string                   // Hex
  arrow: "forward" | "backward" | "both" | "none"
  status: "current" | "stale"

  metadata: {
    protocol?: string
    data_format?: string
    async?: boolean
    description?: string
  }

  created_at: string
  updated_at: string
}
```

---

## Cross-Reference

```typescript
interface CrossReference {
  id: string
  from_element_id: string
  to_element_id: string
  relationship: string            // "implements" | "reads_from" | "secured_by" | etc.
  description: string
  bidirectional: boolean

  created_at: string
}
```

---

## Board Link

```typescript
interface BoardLink {
  id: string
  target_board_id: string
  label: string
  description: string
  element_id: string | null       // Attached to a specific element, or board-level

  created_at: string
}
```

---

## History Models

### Changelog Entry

```typescript
interface ChangelogEntry {
  id: string
  timestamp: string               // ISO 8601
  action: "created" | "updated" | "removed" | "moved" | "connected" | "disconnected"
  target_type: "board" | "section" | "element" | "connection" | "cross_reference" | "decision"
  target_id: string
  target_name: string
  section_id: string | null
  category: SectionCategory | null
  reason: string                  // Why this change was made
  source_context: string | null   // e.g., commit ref, file that changed

  diff: {
    field: string
    old_value: any
    new_value: any
  }[] | null                      // null for "created" and "removed" actions
}
```

### Snapshot

```typescript
interface Snapshot {
  version: number
  timestamp: string
  board: Board                    // Complete board state at this version
}
```

### Milestone

```typescript
interface Milestone {
  name: string                    // Slug format, e.g., "v2-launch"
  description: string
  version: number                 // Points to a snapshot version
  timestamp: string
}
```

### Decision (ADR)

```typescript
interface Decision {
  id: string
  title: string
  context: string
  decision: string
  alternatives: string[]
  consequences: string
  status: "proposed" | "accepted" | "superseded" | "deprecated"
  related_elements: string[]      // Element IDs

  created_at: string
  updated_at: string
}
```

---

## Common Types

```typescript
interface Position {
  x: number                       // Pixels from board origin
  y: number
}

interface Size {
  width: number                   // Pixels
  height: number
}
```

---

## Storage Format

### board.json

The `board.json` file stores the full `Board` object as formatted JSON. Sections are stored flat (not nested). The `parent_section_id` field is used to reconstruct the tree at read time.

### changelog.jsonl

One `ChangelogEntry` per line, JSON-encoded. Append-only. Example:

```json
{"id":"cl_001","timestamp":"2025-06-15T10:30:00Z","action":"created","target_type":"element","target_id":"el_abc","target_name":"Main Architecture","section_id":"sec_xyz","category":"system_structure","reason":"Initial documentation","source_context":null,"diff":null}
{"id":"cl_002","timestamp":"2025-06-15T10:31:00Z","action":"created","target_type":"element","target_id":"el_def","target_name":"Users Table","section_id":"sec_uvw","category":"data_layer","reason":"Initial documentation","source_context":null,"diff":null}
```

### Snapshot files (v001.json, etc.)

Full `Board` object, identical format to `board.json`. These are immutable once written.

### Milestone files

```json
{
  "name": "v2-launch",
  "description": "Board state at v2.0 launch",
  "version": 15,
  "timestamp": "2025-08-01T14:00:00Z"
}
```

### Decision files

Full `Decision` object as JSON.

---

## Validation Rules

1. All IDs must be unique across the board
2. `from_element_id` and `to_element_id` in connections must reference existing elements
3. `section_id` in elements must reference an existing section
4. `parent_section_id` must not create circular nesting
5. Element `data` must match the schema for its `type`
6. `version` must be monotonically increasing
7. Tags must be lowercase, alphanumeric with hyphens only
8. Positions and sizes must be non-negative numbers
