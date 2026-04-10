# Bloo Tools Specification

Every tool follows this response pattern:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { code: string, message: string, suggestion: string } }
```

All tools that modify the board automatically append to the changelog.

---

## 1. Board Lifecycle Tools

### create_board

Create a new documentation board for a project.

```typescript
Input: {
  name: string                    // Board display name (e.g., "My SaaS App")
  project_path: string            // Absolute path to the project root
  description?: string            // Short description of the project
  theme?: "light" | "dark"        // Default: "dark"
  tags?: string[]                 // Project-level tags
}

Output: {
  board_id: string                // e.g., "board_a1b2c3"
  storage_path: string            // Where board data is stored
}
```

**Behavior:** Creates the storage directory, initializes `board.json` with empty sections, creates `changelog.jsonl`, takes initial snapshot `v001.json`.

**Annotations:** `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`

---

### get_board

Retrieve the current state of a board.

```typescript
Input: {
  board_id: string
  include_elements?: boolean      // Default: true. Set false for metadata only.
}

Output: {
  board: Board                    // Full board object (see SCHEMA.md)
  stats: {
    section_count: number
    element_count: number
    connection_count: number
    last_updated: string          // ISO timestamp
    version: number               // Current snapshot version
  }
}
```

**Annotations:** `readOnlyHint: true`

---

### list_boards

List all boards managed by this server.

```typescript
Input: {
  project_path?: string           // Filter by project path
}

Output: {
  boards: Array<{
    board_id: string
    name: string
    project_path: string
    description: string
    last_updated: string
    version: number
    element_count: number
  }>
}
```

**Annotations:** `readOnlyHint: true`

---

### delete_board

Delete a board and all its history.

```typescript
Input: {
  board_id: string
  confirm: true                   // Must be true to proceed
}

Output: {
  deleted: true
}
```

**Annotations:** `destructiveHint: true`

---

### export_board

Render the board to a viewable format.

```typescript
Input: {
  board_id: string
  format: "html" | "markdown" | "png" | "svg" | "mermaid"
  output_path?: string            // Where to save. Default: {project}/docs/board.{format}
  include_timeline?: boolean      // Include changelog timeline panel. Default: true
  include_minimap?: boolean       // Include minimap. Default: true
  sections?: string[]             // Export only specific section IDs. Default: all
}

Output: {
  file_path: string               // Absolute path to the exported file
  size_bytes: number
}
```

**Behavior:**
- `html`: Self-contained interactive board with pan/zoom/minimap/timeline
- `markdown`: Structured markdown with Mermaid diagrams where possible
- `png`: Rasterized image of the full board
- `svg`: Vector image of the full board
- `mermaid`: Collection of Mermaid diagram blocks

If `auto_snapshot` is enabled, takes a snapshot before exporting.

**Annotations:** `readOnlyHint: false` (writes file)

---

### board_health_report

Analyze documentation coverage and staleness.

```typescript
Input: {
  board_id: string
}

Output: {
  coverage: {
    documented: string[]          // Categories with content (e.g., ["system_structure", "data_layer"])
    missing: string[]             // Categories with no content
    coverage_percent: number
  }
  stale_elements: Array<{
    element_id: string
    name: string
    type: string
    last_updated: string
    days_since_update: number
  }>
  issues: Array<{
    type: "broken_connection" | "orphaned_element" | "empty_section" | "missing_cross_ref"
    description: string
    element_ids: string[]
    suggestion: string
  }>
}
```

**Annotations:** `readOnlyHint: true`

---

### validate_board

Check board data integrity.

```typescript
Input: {
  board_id: string
}

Output: {
  valid: boolean
  errors: Array<{
    type: string
    message: string
    element_id?: string
  }>
  warnings: Array<{
    type: string
    message: string
    element_id?: string
  }>
}
```

**Annotations:** `readOnlyHint: true`

---

## 2. Section Tools

### add_section

Add a section (frame/group) to the board.

```typescript
Input: {
  board_id: string
  title: string                   // e.g., "System Architecture"
  category: "system_structure" | "data_layer" | "api_integration" | "security" | "infrastructure" | "user_flows" | "processes" | "project_meta"
  description?: string
  parent_section_id?: string      // For nested sub-sections
  position?: { x: number, y: number }  // Auto-positioned if omitted
  color?: string                  // Hex color. Auto-assigned by category if omitted
  collapsed?: boolean             // Default: false
  tags?: string[]
  reason?: string                 // Why this section is being added (logged to changelog)
}

Output: {
  section_id: string
}
```

---

### update_section

```typescript
Input: {
  board_id: string
  section_id: string
  title?: string
  description?: string
  position?: { x: number, y: number }
  color?: string
  collapsed?: boolean
  tags?: string[]
  reason?: string
}

Output: {
  updated: true
}
```

---

### remove_section

```typescript
Input: {
  board_id: string
  section_id: string
  remove_children?: boolean       // Also remove all elements in this section. Default: true
  reason?: string
}

Output: {
  removed: true
  removed_elements: number        // Count of child elements also removed
}
```

---

### set_layout

Auto-arrange elements within a section.

```typescript
Input: {
  board_id: string
  section_id: string
  layout: "grid" | "horizontal" | "vertical" | "tree" | "force" | "freeform"
  spacing?: number                // Pixels between elements. Default: 40
}

Output: {
  updated_positions: number       // Count of elements repositioned
}
```

---

## 3. Element Tools

### add_element

Add a diagram, note, or other visual element to a section.

```typescript
Input: {
  board_id: string
  section_id: string
  type: ElementType               // See below for all types
  name: string                    // Display name
  description?: string
  position?: { x: number, y: number }
  size?: { width: number, height: number }
  tags?: string[]
  data: ElementData               // Type-specific data (see below)
  reason?: string
}

Output: {
  element_id: string
}
```

#### Element Types and Their Data

**`architecture_diagram`**
```typescript
data: {
  components: Array<{
    id: string                    // Unique within this diagram
    name: string
    type: "service" | "database" | "queue" | "cache" | "client" | "external" | "gateway" | "worker" | "storage" | "cdn" | "load_balancer" | "container"
    description?: string
    technology?: string           // e.g., "Node.js", "PostgreSQL", "Redis"
    layer?: string                // e.g., "frontend", "backend", "data", "infrastructure"
    metadata?: Record<string, string>
  }>
  connections: Array<{
    from: string                  // Component id
    to: string                    // Component id
    label?: string                // e.g., "REST API", "gRPC", "WebSocket"
    protocol?: string             // e.g., "HTTPS", "TCP", "AMQP"
    data_format?: string          // e.g., "JSON", "Protobuf", "GraphQL"
    async?: boolean               // Is this an async connection?
    direction?: "one_way" | "bidirectional"
  }>
  layers?: Array<{
    name: string
    component_ids: string[]
  }>
}
```

**`db_schema`**
```typescript
data: {
  tables: Array<{
    id: string
    name: string
    schema?: string               // e.g., "public"
    description?: string
    columns: Array<{
      name: string
      type: string                // e.g., "uuid", "varchar(255)", "integer"
      primary_key?: boolean
      nullable?: boolean
      unique?: boolean
      default?: string
      description?: string
    }>
    indexes?: Array<{
      name: string
      columns: string[]
      unique?: boolean
    }>
  }>
  relationships: Array<{
    from_table: string
    from_column: string
    to_table: string
    to_column: string
    type: "one_to_one" | "one_to_many" | "many_to_many"
    label?: string
  }>
}
```

**`page_map`**
```typescript
data: {
  pages: Array<{
    id: string
    name: string
    route: string                 // e.g., "/dashboard", "/users/:id"
    description?: string
    type?: "page" | "modal" | "drawer" | "tab"
    auth_required?: boolean
    roles?: string[]              // Required roles
    components?: string[]         // Key components on this page
  }>
  navigations: Array<{
    from: string                  // Page id
    to: string                    // Page id
    trigger: string               // e.g., "click button", "submit form", "redirect"
    condition?: string            // e.g., "if authenticated"
  }>
}
```

**`flow_chart`**
```typescript
data: {
  nodes: Array<{
    id: string
    name: string
    type: "start" | "end" | "process" | "decision" | "io" | "subprocess" | "delay" | "loop"
    description?: string
  }>
  edges: Array<{
    from: string
    to: string
    label?: string                // e.g., "yes", "no", "error", "success"
    condition?: string
  }>
}
```

**`api_map`**
```typescript
data: {
  base_url?: string
  groups: Array<{
    name: string                  // Resource name (e.g., "Users", "Orders")
    description?: string
    endpoints: Array<{
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "WS" | "SSE" | "GRAPHQL"
      path: string                // e.g., "/users/:id"
      description: string
      auth?: boolean
      request_body?: string       // Brief shape description
      response_body?: string      // Brief shape description
      status_codes?: Array<{ code: number, description: string }>
    }>
  }>
}
```

**`sequence_diagram`**
```typescript
data: {
  actors: Array<{
    id: string
    name: string
    type?: "user" | "service" | "database" | "external" | "queue"
  }>
  messages: Array<{
    from: string                  // Actor id
    to: string                    // Actor id
    label: string
    type?: "sync" | "async" | "response" | "self"
    order: number                 // Sequence order
    note?: string
  }>
}
```

**`file_tree`**
```typescript
data: {
  root: string                    // Root directory name
  entries: Array<{
    path: string                  // Relative path (e.g., "src/index.ts")
    type: "file" | "directory"
    description?: string          // Annotation for this file/dir
    highlight?: boolean           // Visually emphasize this entry
    technology?: string           // e.g., "TypeScript", "Config"
  }>
}
```

**`dependency_graph`**
```typescript
data: {
  nodes: Array<{
    id: string
    name: string
    type: "internal" | "external" | "devDependency"
    version?: string
    description?: string
  }>
  edges: Array<{
    from: string
    to: string
    type?: "imports" | "depends_on" | "peer"
  }>
}
```

**`security_layer_map`**
```typescript
data: {
  layers: Array<{
    id: string
    name: string                  // e.g., "WAF", "Rate Limiting", "Auth", "RBAC", "Encryption"
    level: number                 // Order from outermost (0) to innermost
    description?: string
    technology?: string           // e.g., "Cloudflare", "express-rate-limit", "JWT"
    configuration?: string        // Brief config notes
  }>
  flows: Array<{
    name: string                  // e.g., "API Request"
    path: string[]                // Layer IDs the request passes through in order
  }>
}
```

**`cicd_pipeline`**
```typescript
data: {
  trigger: string                 // e.g., "push to main", "PR merge", "manual"
  platform?: string              // e.g., "GitHub Actions", "GitLab CI", "Jenkins"
  stages: Array<{
    id: string
    name: string                  // e.g., "Build", "Test", "Deploy"
    steps: Array<{
      name: string
      command?: string
      description?: string
    }>
    parallel?: boolean
    environment?: string          // e.g., "staging", "production"
    depends_on?: string[]         // Stage IDs
  }>
}
```

**`environment_map`**
```typescript
data: {
  environments: Array<{
    id: string
    name: string                  // e.g., "Development", "Staging", "Production"
    url?: string
    infrastructure?: string       // e.g., "AWS ECS", "Vercel", "Docker Compose"
    services: Array<{
      name: string
      replicas?: number
      resources?: string          // e.g., "2 CPU, 4GB RAM"
    }>
    database?: string
    notes?: string
  }>
  promotions: Array<{
    from: string                  // Environment id
    to: string                    // Environment id
    method: string                // e.g., "manual approval", "auto on green CI"
  }>
}
```

**`permission_matrix`**
```typescript
data: {
  roles: string[]                 // e.g., ["admin", "editor", "viewer", "guest"]
  resources: Array<{
    name: string                  // e.g., "Users", "Posts", "Settings"
    permissions: Record<string, string[]>  // role -> actions (e.g., { "admin": ["read", "write", "delete"] })
  }>
}
```

**`tech_stack`**
```typescript
data: {
  categories: Array<{
    name: string                  // e.g., "Frontend", "Backend", "Database", "DevOps"
    technologies: Array<{
      name: string
      version?: string
      purpose: string             // e.g., "UI framework", "ORM", "Testing"
      url?: string
    }>
  }>
}
```

**`note`**
```typescript
data: {
  content: string                 // Short text (sticky note style)
  color?: "yellow" | "blue" | "green" | "pink" | "orange" | "purple"
  priority?: "low" | "medium" | "high"
}
```

**`text_block`**
```typescript
data: {
  content: string                 // Longer markdown content
}
```

**`image`**
```typescript
data: {
  src: string                     // Base64 data URI or file path
  alt: string
  caption?: string
}
```

**`badge`**
```typescript
data: {
  label: string                   // e.g., "Needs Refactor", "Stable", "WIP", "Deprecated"
  color?: string                  // Hex color
  icon?: string                   // Icon name (optional)
  attached_to?: string            // Element ID this badge is attached to
}
```

---

### update_element

```typescript
Input: {
  board_id: string
  element_id: string
  name?: string
  description?: string
  position?: { x: number, y: number }
  size?: { width: number, height: number }
  tags?: string[]
  data?: Partial<ElementData>     // Partial update — merged with existing data
  reason?: string                 // Logged to changelog
}

Output: {
  updated: true
  previous_version: number        // Snapshot version before the update
}
```

---

### remove_element

```typescript
Input: {
  board_id: string
  element_id: string
  reason?: string
}

Output: {
  removed: true
  removed_connections: number     // Connections that were also removed
}
```

---

### get_element

```typescript
Input: {
  board_id: string
  element_id: string
  include_history?: boolean       // Include changelog entries for this element
}

Output: {
  element: Element
  history?: ChangelogEntry[]
}
```

**Annotations:** `readOnlyHint: true`

---

### bulk_add_elements

Add multiple elements at once. Reduces round trips.

```typescript
Input: {
  board_id: string
  section_id: string
  elements: Array<{
    type: ElementType
    name: string
    description?: string
    tags?: string[]
    data: ElementData
  }>
  reason?: string
}

Output: {
  element_ids: string[]           // IDs in same order as input
}
```

---

### bulk_update_elements

Update multiple elements at once.

```typescript
Input: {
  board_id: string
  updates: Array<{
    element_id: string
    name?: string
    description?: string
    tags?: string[]
    data?: Partial<ElementData>
  }>
  reason?: string
}

Output: {
  updated_count: number
}
```

---

## 4. Connection & Reference Tools

### add_connection

Draw a visual connection between any two elements.

```typescript
Input: {
  board_id: string
  from_element_id: string
  to_element_id: string
  label?: string
  style?: "solid" | "dashed" | "dotted"
  color?: string
  arrow?: "forward" | "backward" | "both" | "none"
  metadata?: {
    protocol?: string             // e.g., "HTTPS", "gRPC"
    data_format?: string          // e.g., "JSON"
    async?: boolean
    description?: string
  }
  reason?: string
}

Output: {
  connection_id: string
}
```

---

### update_connection

```typescript
Input: {
  board_id: string
  connection_id: string
  label?: string
  style?: "solid" | "dashed" | "dotted"
  color?: string
  metadata?: Record<string, string>
  reason?: string
}

Output: {
  updated: true
}
```

---

### remove_connection

```typescript
Input: {
  board_id: string
  connection_id: string
  reason?: string
}

Output: {
  removed: true
}
```

---

### add_cross_reference

Create a semantic link between related elements in different sections.

```typescript
Input: {
  board_id: string
  from_element_id: string
  to_element_id: string
  relationship: string            // e.g., "implements", "reads_from", "secured_by", "deployed_via", "documented_in"
  description?: string
  bidirectional?: boolean         // Default: false
  reason?: string
}

Output: {
  reference_id: string
}
```

---

### add_board_link

Link to another project's board.

```typescript
Input: {
  board_id: string
  target_board_id: string
  label: string                   // e.g., "Backend API", "Shared Library"
  description?: string
  element_id?: string             // Attach this link to a specific element
  reason?: string
}

Output: {
  link_id: string
}
```

---

## 5. History & Decision Tools

See `HISTORY.md` for full details on the history system.

### get_history

```typescript
Input: {
  board_id: string
  from_date?: string              // ISO timestamp
  to_date?: string
  element_id?: string             // Filter by element
  section_id?: string             // Filter by section
  action?: "created" | "updated" | "removed"
  limit?: number                  // Default: 50
  offset?: number                 // Default: 0
}

Output: {
  entries: ChangelogEntry[]
  total: number
}
```

---

### get_element_history

```typescript
Input: {
  board_id: string
  element_id: string
}

Output: {
  entries: ChangelogEntry[]
  created_at: string
  update_count: number
}
```

---

### add_milestone

```typescript
Input: {
  board_id: string
  name: string                    // e.g., "v2.0-launch", "pre-refactor"
  description?: string
}

Output: {
  milestone_name: string
  snapshot_version: number
}
```

---

### get_snapshot

```typescript
Input: {
  board_id: string
  version?: number                // Snapshot version number
  milestone?: string              // Or milestone name
}

Output: {
  board: Board                    // Full board state at that point
  version: number
  timestamp: string
}
```

---

### compare_snapshots

```typescript
Input: {
  board_id: string
  from_version: number | string   // Version number or milestone name
  to_version: number | string     // Version number or milestone name
}

Output: {
  added: Array<{ type: string, name: string, element_id: string }>
  removed: Array<{ type: string, name: string, element_id: string }>
  modified: Array<{
    element_id: string
    name: string
    changes: Array<{ field: string, old_value: any, new_value: any }>
  }>
  sections_added: string[]
  sections_removed: string[]
}
```

---

### add_decision

Record an architectural decision (lightweight ADR).

```typescript
Input: {
  board_id: string
  title: string                   // e.g., "Chose PostgreSQL over MongoDB"
  context: string                 // Why this decision was needed
  decision: string                // What was decided
  alternatives?: string[]         // What else was considered
  consequences?: string           // Expected impact
  related_elements?: string[]     // Element IDs this decision affects
  status?: "proposed" | "accepted" | "superseded" | "deprecated"
}

Output: {
  decision_id: string
}
```

---

### get_decisions

```typescript
Input: {
  board_id: string
  status?: string
  element_id?: string             // Get decisions related to an element
}

Output: {
  decisions: Decision[]
}
```

---

### get_timeline

Get a high-level timeline for rendering in the board.

```typescript
Input: {
  board_id: string
  granularity?: "day" | "week" | "month"
}

Output: {
  entries: Array<{
    date: string
    type: "change" | "milestone" | "decision"
    summary: string
    details_count: number         // Number of individual changes on this date
    milestone_name?: string
    decision_title?: string
  }>
}
```

---

## 6. Search & Organization Tools

### search_board

Search across all elements in a board.

```typescript
Input: {
  board_id: string
  query?: string                  // Free text search across names, descriptions, content
  type?: ElementType              // Filter by element type
  tags?: string[]                 // Filter by tags (AND logic)
  section_id?: string             // Search within a section
  status?: "current" | "stale"
  category?: string               // Filter by section category
}

Output: {
  results: Array<{
    element_id: string
    name: string
    type: string
    section_id: string
    section_name: string
    match_context: string         // Snippet showing where the match was found
    tags: string[]
    last_updated: string
  }>
}
```

---

### add_tag

```typescript
Input: {
  board_id: string
  element_id: string
  tags: string[]
}

Output: {
  updated_tags: string[]          // Full list after adding
}
```

---

### remove_tag

```typescript
Input: {
  board_id: string
  element_id: string
  tags: string[]
}

Output: {
  updated_tags: string[]
}
```
