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

## Best Practices
- Always provide a `reason` for changes (builds the changelog)
- Use `bulk_add_elements` for multiple elements at once
- Cross-reference related elements across sections
- Tag meaningfully: critical, tech-debt, needs-review
- Start broad (architecture), then detail (DB schemas, API maps)
