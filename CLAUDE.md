# Bloo MCP Server

Bloo is a documentation platform that you (Claude Code) can use to create interactive visual documentation boards for any software project.

## How to Use

1. Bloo is running at `http://localhost:3000`
2. Connect via MCP SSE: `http://localhost:3000/mcp/sse`

## Available Tools (33 total)

### Board Lifecycle
- `create_board` — Create a new board for a project (needs project_id, name, description)
- `get_board` — Get full board data with all sections and elements
- `list_boards` — List all boards
- `delete_board` — Delete a board
- `export_board` — Export to HTML, Markdown, or Mermaid
- `board_health_report` — Analyze documentation coverage
- `validate_board` — Check data integrity

### Sections (8 categories)
- `add_section` — Add a section: system_structure, data_layer, api_integration, security, infrastructure, user_flows, processes, project_meta
- `update_section` / `remove_section` / `set_layout`

### Elements (17 types)
- `add_element` — Add: architecture_diagram, db_schema, flow_chart, sequence_diagram, api_map, page_map, security_layer_map, cicd_pipeline, environment_map, permission_matrix, dependency_graph, tech_stack, file_tree, note, text_block, image, badge
- `update_element` / `remove_element` / `get_element`
- `bulk_add_elements` / `bulk_update_elements`

### Connections
- `add_connection` / `update_connection` / `remove_connection`
- `add_cross_reference` / `add_board_link`

### History
- `get_history` / `get_element_history` / `get_timeline`
- `add_milestone` / `get_snapshot` / `compare_snapshots`
- `add_decision` / `get_decisions`

### Search
- `search_board` / `add_tag` / `remove_tag`

## Documentation Workflow

1. Create a board: `create_board(project_id, name, description)`
2. Add sections for each area (system_structure, data_layer, etc.)
3. Add elements with detailed data (architecture diagrams, DB schemas, flow charts, etc.)
4. Add cross-references between related elements
5. Record architectural decisions
6. Add milestone when documentation is complete
7. Export to HTML for sharing

## Element Data Reference

Field names matter — using wrong names (e.g., `label` instead of `name`) causes silent rendering failures. Use the exact field names below.

### architecture_diagram
```json
{ "components": [{ "id": "api", "name": "API Server", "type": "service", "technology": "FastAPI" }],
  "connections": [{ "from": "api", "to": "db", "label": "SQL queries", "protocol": "TCP" }],
  "layers": [{ "name": "Backend", "component_ids": ["api", "db"] }] }
```
Types: service, database, queue, cache, client, external, gateway, worker, storage

### db_schema
```json
{ "tables": [{ "id": "users", "name": "users", "columns": [
    { "name": "id", "type": "SERIAL PK", "primary_key": true },
    { "name": "email", "type": "VARCHAR(255)", "unique": true }
  ]}],
  "relationships": [{ "from_table": "orders", "from_column": "user_id", "to_table": "users", "to_column": "id", "type": "many_to_one" }] }
```
**Critical**: tables need `id` field (use table name). Relationships use `from_table`/`to_table` (NOT `from`/`to`). Type uses underscores: `one_to_one`, `one_to_many`, `many_to_one`, `many_to_many`.

### sequence_diagram
```json
{ "actors": [{ "id": "user", "name": "User", "type": "user" },
             { "id": "api", "name": "API Server", "type": "service" }],
  "messages": [{ "from": "user", "to": "api", "label": "POST /login", "type": "sync", "order": 1 }] }
```
**Critical**: actors need `name` field (NOT `label`). Types: user, service, database, external, queue. Message types: sync, async, response, self.

### page_map
```json
{ "pages": [{ "id": "login", "name": "Login", "route": "/login", "type": "page", "auth_required": false },
            { "id": "dashboard", "name": "Dashboard", "route": "/dashboard", "type": "page", "auth_required": true }],
  "navigations": [{ "from": "login", "to": "dashboard", "trigger": "login success", "condition": "authenticated" }] }
```
**Critical**: pages need `id` and `route` fields (NOT `path`). Always include `navigations` to show page flow arrows. Types: page, modal, drawer, tab.

### flow_chart
```json
{ "nodes": [{ "id": "start", "name": "Start", "type": "start" },
            { "id": "process", "name": "Process Data", "type": "process" }],
  "edges": [{ "from": "start", "to": "process", "label": "begin" }] }
```
Types: start, end, process, decision, io, subprocess, delay, loop

### file_tree
```json
{ "root": "project-name",
  "entries": [{ "path": "src", "type": "directory", "description": "Source code" },
              { "path": "src/main.py", "type": "file", "technology": "Python" }] }
```

### note / text_block
Content supports markdown: `## headers`, `**bold**`, `*italic*`, `` `code` ``, `- bullets`, `1. numbered`.
```json
{ "content": "## Overview\n\nThis service handles **authentication** and...\n\n- JWT tokens\n- OAuth2 flow" }
```

### badge
```json
{ "badges": [{ "label": "Python 3.12", "color": "blue" }, { "label": "Docker", "color": "#2496ED" }] }
```
`badges` is an array of `{ label, color?, icon? }`. Colors: green, blue, red, yellow, orange, purple, pink, or any hex color.

## Best Practices
- Always provide a `reason` for changes (builds the changelog)
- Use `bulk_add_elements` for multiple elements at once
- Cross-reference related elements across sections
- Tag meaningfully: critical, tech-debt, needs-review
- Start broad (architecture), then detail (DB schemas, API maps)
- **Always include relationship/navigation/connection data** — diagrams without connections look incomplete
- Use markdown in notes and text blocks for proper formatting
