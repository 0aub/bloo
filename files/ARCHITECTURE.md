# Bloo Architecture

## System Overview

Bloo is a local MCP server that runs via stdio alongside Claude Code. It manages board data as JSON files on disk, and renders self-contained interactive HTML boards.

```
┌─────────────┐     stdio      ┌──────────────────┐      fs       ┌──────────────┐
│ Claude Code  │ ◄──────────► │  Bloo MCP     │ ◄───────────► │  JSON Storage │
│  (client)    │   tool calls  │  Server (TS)      │   read/write  │  (per-project)│
└─────────────┘               └──────────────────┘               └──────────────┘
                                       │
                                       │ export_board
                                       ▼
                              ┌──────────────────┐
                              │  HTML Renderer    │
                              │  (D3.js/SVG)      │
                              └──────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  board.html       │
                              │  (self-contained) │
                              └──────────────────┘
```

---

## Project Structure

```
bloo-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # MCP server entry point, stdio transport
│   ├── tools/
│   │   ├── board.ts              # Board lifecycle tools (create, get, list, delete, export)
│   │   ├── sections.ts           # Section CRUD and layout tools
│   │   ├── elements.ts           # Element CRUD, bulk operations
│   │   ├── connections.ts        # Connections and cross-references
│   │   ├── history.ts            # Changelog, snapshots, milestones, decisions
│   │   ├── search.ts             # Search, tags, filtering
│   │   └── health.ts             # Board health report, validation
│   ├── storage/
│   │   ├── board-store.ts        # Read/write board JSON, file locking
│   │   ├── history-store.ts      # Append-only changelog, snapshot management
│   │   └── paths.ts              # Path resolution for board storage
│   ├── renderer/
│   │   ├── html-renderer.ts      # Main HTML board renderer
│   │   ├── diagram-renderers/    # Per-type SVG renderers
│   │   │   ├── architecture.ts
│   │   │   ├── db-schema.ts
│   │   │   ├── flow-chart.ts
│   │   │   ├── page-map.ts
│   │   │   ├── api-map.ts
│   │   │   ├── sequence.ts
│   │   │   ├── file-tree.ts
│   │   │   ├── dependency-graph.ts
│   │   │   ├── security-map.ts
│   │   │   ├── cicd-pipeline.ts
│   │   │   ├── environment-map.ts
│   │   │   ├── permission-matrix.ts
│   │   │   └── tech-stack.ts
│   │   ├── layout-engine.ts      # Auto-positioning of elements
│   │   ├── theme.ts              # Color schemes, fonts, spacing
│   │   └── templates/            # HTML/CSS/JS templates for the board shell
│   │       ├── board-shell.html  # Main HTML template with pan/zoom/minimap
│   │       ├── board.css         # Styles based on BRANDING.md (inlined at export)
│   │       └── board.js          # Interactivity (inlined at export)
│   ├── models/
│   │   ├── board.ts              # Board, Section, Element interfaces
│   │   ├── elements.ts           # Per-type element data interfaces
│   │   ├── connections.ts        # Connection and cross-reference interfaces
│   │   └── history.ts            # Changelog, snapshot, decision interfaces
│   └── utils/
│       ├── id-generator.ts       # Unique ID generation
│       ├── diff.ts               # JSON diff for snapshots
│       ├── validators.ts         # Input validation helpers
│       └── markdown-export.ts    # Markdown/Mermaid export helpers
├── assets/
│   └── d3.min.js                 # Bundled D3.js for offline rendering
└── tests/
    ├── tools/                    # Tool-level tests
    ├── storage/                  # Storage tests
    └── renderer/                 # Renderer tests
```

---

## Storage Architecture

### Directory Structure Per Board

```
{boards_root}/
├── boards.index.json              # Index of all boards (id, name, project_path, updated)
└── {board-id}/
    ├── board.json                 # Current board state (full data)
    ├── history/
    │   ├── changelog.jsonl        # Append-only log (one JSON object per line)
    │   └── snapshots/
    │       ├── v001.json          # Full board state at version 1
    │       ├── v002.json
    │       └── ...
    ├── milestones/
    │   ├── initial-documentation.json
    │   └── v2-launch.json
    └── decisions/
        ├── 001-chose-postgres.json
        └── 002-switched-to-jwt.json
```

### Default Storage Root

The `boards_root` defaults to `.bloo/` in the project directory. This way documentation lives alongside the code and can be committed to version control.

### File Locking

Since only Claude Code accesses the MCP server (single client), simple write-after-read is sufficient. No concurrent access handling needed. However, writes should be atomic — write to a temp file, then rename.

---

## Data Flow

### Creating Documentation

```
Claude Code                    Bloo MCP                  Storage
    │                              │                            │
    ├─ create_board ──────────────►│                            │
    │                              ├─ create board.json ───────►│
    │                              │◄─ board_id ───────────────┤
    │◄─ { board_id } ─────────────┤                            │
    │                              │                            │
    ├─ add_section ───────────────►│                            │
    │                              ├─ update board.json ───────►│
    │                              ├─ append changelog ────────►│
    │◄─ { section_id } ───────────┤                            │
    │                              │                            │
    ├─ add_element ───────────────►│                            │
    │  (architecture_diagram)      ├─ update board.json ───────►│
    │                              ├─ append changelog ────────►│
    │◄─ { element_id } ───────────┤                            │
    │                              │                            │
    ├─ ... more elements ...       │                            │
    │                              │                            │
    ├─ export_board ──────────────►│                            │
    │                              ├─ read board.json ─────────►│
    │                              │◄─ board data ─────────────┤
    │                              ├─ render HTML ─────────────►│ (write board.html)
    │◄─ { file_path } ────────────┤                            │
```

### Updating Documentation

```
Claude Code                    Bloo MCP                  Storage
    │                              │                            │
    ├─ get_board ─────────────────►│                            │
    │                              ├─ read board.json ─────────►│
    │◄─ { board data } ───────────┤                            │
    │                              │                            │
    ├─ board_health_report ───────►│                            │
    │                              ├─ analyze coverage ────────►│
    │◄─ { gaps, stale items } ────┤                            │
    │                              │                            │
    ├─ update_element ────────────►│                            │
    │  (with reason)               ├─ update board.json ───────►│
    │                              ├─ append changelog ────────►│
    │                              ├─ auto-snapshot ───────────►│
    │◄─ { updated } ──────────────┤                            │
```

---

## Rendering Pipeline

1. **Read** — Load `board.json` with all sections, elements, connections
2. **Layout** — Run layout engine to position elements that don't have explicit coordinates
3. **Render diagrams** — Each element type has its own SVG renderer that converts data → SVG markup
4. **Compose** — Place all rendered SVGs into the board shell template with sections as containers
5. **Bundle** — Inline all CSS, JS (D3.js, interactivity), and SVG into a single HTML file
6. **Write** — Save to the specified output path

### What Gets Inlined

The final HTML file has zero external dependencies:
- D3.js (minified, ~250KB)
- All CSS for themes, layouts, diagram styles
- All JS for pan/zoom, minimap, section collapse, search, timeline panel
- All SVG diagram content
- Board data as embedded JSON (for the interactive features)

---

## ID Generation

All IDs are prefixed with their type for readability:
- Boards: `board_` + nanoid (e.g., `board_a1b2c3`)
- Sections: `sec_` + nanoid
- Elements: `el_` + nanoid
- Connections: `conn_` + nanoid
- Snapshots: `v` + zero-padded number (e.g., `v001`, `v002`)

---

## Error Handling

All tools return structured responses:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { code: "BOARD_NOT_FOUND", message: "No board with id 'board_xyz'", suggestion: "Use list_boards to see available boards" } }
```

Error codes are actionable — they tell Claude Code what to do next.

---

## Configuration

The MCP server accepts configuration via environment variables or a `.bloo.config.json` file in the project root:

```json
{
  "storage_root": ".bloo",
  "default_theme": "dark",
  "auto_snapshot": true,
  "snapshot_on_export": true,
  "max_snapshots": 50,
  "export_path": "./docs"
}
```
