# Bloo

**Blueprint your code** — Interactive visual documentation for software projects.

Bloo is an open-source documentation platform that works with [Claude Code](https://claude.ai/code). Claude Code analyzes your codebase and generates rich visual documentation boards — architecture diagrams, database schemas, API maps, flow charts, sequence diagrams, and more.

## Quick Start

```bash
git clone https://github.com/0aub/bloo.git
cd bloo
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Run Bloo** — `docker compose up` starts the web UI and MCP server
2. **Add a project** — Click "+" in the dashboard, enter the project path
3. **Connect Claude Code** — Add Bloo as an MCP server in Claude Code settings
4. **Document** — Tell Claude Code: "Document this project using Bloo"
5. **View & arrange** — Open the board in the web UI, drag cards around
6. **Export** — Download as HTML, Markdown, or Mermaid

## Claude Code MCP Configuration

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "bloo": {
      "url": "http://localhost:3000/mcp/sse"
    }
  }
}
```

## Features

- **17 diagram types** — Architecture, DB schema, flow chart, sequence, API map, CI/CD pipeline, security layers, and more
- **Interactive canvas** — Drag, zoom, pan, resize cards on an infinite canvas
- **Dark/light themes** — Full theme support with proper SVG color handling
- **Edit mode** — Lock/unlock cards, 8-point resize handles
- **Search** — Find any element across the board
- **History tracking** — Changelog, snapshots, milestones, architectural decisions
- **Multi-project** — Document multiple projects from one Bloo instance
- **Export** — HTML (self-contained), Markdown, Mermaid

## Docker Compose

```yaml
services:
  bloo:
    image: ghcr.io/0aub/bloo:latest
    ports:
      - "3000:3000"
    volumes:
      - bloo-data:/app/data
      - /path/to/your/projects:/projects
    environment:
      - BLOO_PROJECTS_ROOT=/projects

volumes:
  bloo-data:
```

Mount your projects directory so Bloo can access them.

## Architecture

```
┌─────────────┐     MCP/SSE      ┌──────────────┐     HTTP      ┌──────────────┐
│ Claude Code  │ ◄──────────────► │  Bloo Server │ ◄──────────► │  Browser     │
│ (analyzes)   │   33 tools      │  (Express)   │  :3000       │  (React UI)  │
└─────────────┘                  │  SQLite DB   │              └──────────────┘
                                 └──────────────┘
```

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React 19 + Vite + Tailwind CSS
- **MCP Transport**: SSE over HTTP
- **Storage**: SQLite with WAL mode

## License

MIT
