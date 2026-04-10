# Bloo MCP Server

## Overview

Bloo is an MCP server that enables Claude Code to create, maintain, and evolve rich visual documentation for software projects. It produces interactive HTML boards — similar to Miro or Canva — that serve as living technical blueprints.

**Key principle:** Bloo is used exclusively by Claude Code, not by humans directly. All tools are designed for programmatic use. The output (HTML boards) is what humans view.

---

## When to Use

- Documenting a new project from scratch
- Updating documentation after code changes
- Adding documentation for a specific concern (security, infrastructure, data flow)
- Reviewing documentation coverage and filling gaps
- Comparing project state across milestones
- Recording architectural decisions

---

## Two Modes of Operation

### 1. Full Documentation (New Project)

Claude Code scans the entire codebase and produces comprehensive documentation:

1. `create_board` — initialize a board for the project
2. Analyze codebase structure, dependencies, config
3. Add sections and diagrams for each concern area
4. Add cross-references between related elements
5. Set a milestone ("initial-documentation")
6. Export to HTML

### 2. Incremental Update (Existing Project)

Claude Code detects changes and updates the board:

1. `get_board` — read current board state
2. `board_health_report` — check what's stale or missing
3. Update/add/remove elements as needed
4. Log reasons for each change
5. Auto-snapshot the new version
6. Export updated HTML

---

## Documentation Coverage Areas

Bloo covers the full system across these categories:

| Category | What It Documents |
|---|---|
| **System Structure** | Architecture, file tree, module dependencies, monorepo packages |
| **Data Layer** | DB schema (ERD), data flows, cache strategy, migrations |
| **API & Integration** | REST/GraphQL/gRPC endpoints, external services, webhooks, events/queues |
| **Security** | Auth flows, permission matrix, security layers, secret management |
| **Infrastructure** | Environments, CI/CD pipelines, deployment architecture, monitoring |
| **User Flows** | Pages/screens, navigation, user journeys, state management |
| **Processes** | Business logic flows, background jobs, error handling, retry strategies |
| **Project Meta** | Tech stack, config/env vars, feature flags, testing strategy, tech debt |

---

## Tool Summary

### Board Lifecycle
- `create_board` | `get_board` | `list_boards` | `delete_board`
- `export_board` (HTML, Markdown, PNG, SVG, Mermaid)
- `board_health_report` | `validate_board`

### Sections & Layout
- `add_section` | `update_section` | `remove_section`
- `set_layout`

### Diagrams & Elements
- `add_element` | `update_element` | `remove_element` | `get_element`
- `bulk_add_elements` | `bulk_update_elements`
- Supported element types: `architecture_diagram`, `db_schema`, `page_map`, `flow_chart`, `api_map`, `sequence_diagram`, `file_tree`, `dependency_graph`, `security_layer_map`, `cicd_pipeline`, `environment_map`, `permission_matrix`, `tech_stack`, `note`, `text_block`, `image`, `badge`

### Connections & References
- `add_connection` | `update_connection` | `remove_connection`
- `add_cross_reference` — link related elements across sections
- `add_board_link` — link to another project's board

### History & Decisions
- `get_history` | `get_element_history` | `get_timeline`
- `add_milestone` | `get_snapshot` | `compare_snapshots`
- `add_decision` | `get_decisions`

### Search & Organization
- `search_board` — search by name, type, tag, content, status
- `add_tag` | `remove_tag`

---

## Reference Files

| File | Purpose |
|---|---|
| `BRANDING.md` | Visual identity, color system, glow effects, typography, animations |
| `ARCHITECTURE.md` | Server internals, data model, storage, rendering pipeline |
| `TOOLS.md` | Complete tool specifications with input/output schemas |
| `SCHEMA.md` | Full JSON schema for board data model |
| `TEMPLATES.md` | Visual templates and rendering rules for each diagram type |
| `RENDERING.md` | Interactive HTML rendering engine specification |
| `WORKFLOWS.md` | Step-by-step documentation workflows for Claude Code |
| `HISTORY.md` | Change tracking, snapshots, milestones, decisions |
| `EXAMPLES.md` | Realistic full-board examples and tool call sequences |

---

## Implementation Stack

- **Language:** TypeScript
- **Transport:** stdio (local MCP server, runs alongside Claude Code)
- **Storage:** JSON files on disk (per-project)
- **Rendering:** Self-contained HTML with inline D3.js/SVG
- **Dependencies:** Minimal — no database, no external services
