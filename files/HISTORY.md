# Bloo History System

The history system tracks every modification to a board, enabling full project evolution tracking, milestone management, and architectural decision records.

---

## Core Principles

1. **Append-only changelog** — changes are never deleted, only appended
2. **Full snapshots** — every version stores the complete board state (no incremental diffs to reconstruct)
3. **Named milestones** — significant points in the project's evolution get a human-readable name
4. **Architectural Decision Records** — why decisions were made, stored alongside the visual documentation
5. **Every change has a reason** — Claude Code must explain why every modification was made

---

## Changelog

### Storage

`history/changelog.jsonl` — one JSON object per line, appended atomically.

### Entry Format

```typescript
{
  id: "cl_001",
  timestamp: "2025-06-15T10:30:00Z",
  action: "created",                    // created | updated | removed | moved | connected | disconnected
  target_type: "element",              // board | section | element | connection | cross_reference | decision
  target_id: "el_abc123",
  target_name: "Main Architecture",
  element_type: "architecture_diagram", // Only for elements
  section_id: "sec_xyz",              // Which section was affected
  category: "system_structure",        // Section category
  reason: "Initial documentation of system architecture",
  source_context: null,                // Optional: commit hash, file path, or trigger description
  diff: null                           // null for "created", array of field changes for "updated"
}
```

### Diff Format (for updates)

```typescript
diff: [
  {
    field: "data.tables",
    old_value: 5,                      // Summary: "5 tables"
    new_value: 7                       // Summary: "7 tables" (added users_sessions, audit_logs)
  },
  {
    field: "name",
    old_value: "DB Schema",
    new_value: "Database Schema v2"
  }
]
```

For complex data changes (like adding tables to a DB schema), the diff should summarize rather than dump the full before/after data. The full data is in the snapshots.

### Changelog Queries

The `get_history` tool supports filtering:
- By date range (`from_date`, `to_date`)
- By element (`element_id`)
- By section (`section_id`)
- By category
- By action type
- Pagination via `limit` and `offset`

---

## Snapshots

### When Snapshots Are Created

1. **Board creation** — v001 is the initial empty board
2. **Before export** — if `snapshot_on_export` is enabled (default: true)
3. **Manual milestone** — `add_milestone` always creates a snapshot
4. **Auto-snapshot** — if `auto_snapshot` is enabled, a snapshot is created after every tool call that modifies the board

### Storage

`history/snapshots/v001.json`, `v002.json`, etc.

Each file is a complete copy of `board.json` at that version. This allows instant retrieval of any historical state without replaying the changelog.

### Version Management

The `version` field on the board is monotonically increasing. Every snapshot increments it.

When `max_snapshots` is reached, the oldest non-milestone snapshots are pruned. Milestone snapshots are never pruned.

### Snapshot Comparison

`compare_snapshots` diffs two versions and returns:

```typescript
{
  from_version: 5,
  to_version: 12,
  from_timestamp: "2025-06-15T10:30:00Z",
  to_timestamp: "2025-08-01T14:00:00Z",

  added: [
    { type: "section", name: "Security", id: "sec_new1" },
    { type: "element", name: "Auth Flow", id: "el_new1" }
  ],

  removed: [
    { type: "element", name: "Old API Map", id: "el_old1" }
  ],

  modified: [
    {
      element_id: "el_abc",
      name: "Database Schema",
      changes: [
        { field: "data.tables.length", old_value: 5, new_value: 8 },
        { field: "tags", old_value: ["core"], new_value: ["core", "v2"] }
      ]
    }
  ],

  sections_added: ["sec_new1"],
  sections_removed: [],

  stats: {
    total_changes: 23,
    decisions_made: 3,
    days_between: 47
  }
}
```

---

## Milestones

### Purpose

Milestones mark significant points in the project's evolution. They're named snapshots that persist forever (never pruned).

### Storage

`milestones/{name}.json`:

```json
{
  "name": "v2-launch",
  "description": "Board state at v2.0 launch — migrated to microservices, added payment system",
  "version": 15,
  "timestamp": "2025-08-01T14:00:00Z"
}
```

### Naming Convention

Use lowercase slugs: `initial-documentation`, `pre-refactor`, `v2-launch`, `post-security-audit`

### Common Milestones

Claude Code should create milestones at these points:
- `initial-documentation` — first full documentation run
- `pre-{major-change}` — before a significant refactor or migration
- `v{X.Y}` — at each release
- `post-{event}` — after an audit, incident, or major change

---

## Architectural Decision Records (ADRs)

### Purpose

ADRs capture why architectural choices were made. Months later, someone can understand not just what the system looks like, but why it was built this way.

### Storage

`decisions/{id}-{slug}.json`:

```json
{
  "id": "dec_001",
  "title": "Chose PostgreSQL over MongoDB",
  "context": "Need a database for the user management system. Data is highly relational (users, roles, permissions, organizations). We need ACID transactions for payment-related operations.",
  "decision": "Use PostgreSQL with Prisma ORM. Schema-first approach with migrations tracked in version control.",
  "alternatives": [
    "MongoDB — considered for flexibility, rejected due to relational data needs",
    "MySQL — considered, PostgreSQL preferred for JSON support and advanced features"
  ],
  "consequences": "Need to manage migrations carefully. Prisma adds a build step. PostgreSQL hosting is straightforward on all major cloud providers.",
  "status": "accepted",
  "related_elements": ["el_db_schema_001", "el_arch_001"],
  "created_at": "2025-06-15T10:30:00Z",
  "updated_at": "2025-06-15T10:30:00Z"
}
```

### Decision Status Flow

```
proposed → accepted
                  → superseded (by a new decision)
                  → deprecated (no longer relevant)
```

When a decision is superseded, link to the new decision in the changelog reason.

### When to Record Decisions

Claude Code should create a decision when it observes:
- Technology choices that aren't the obvious default
- Patterns that deviate from conventions (and there's a comment/readme explaining why)
- Config that suggests a deliberate tradeoff (e.g., aggressive caching TTLs, unusual retry policies)
- Architecture patterns that have clear alternatives (monolith vs microservices, REST vs GraphQL)

---

## Timeline Rendering

The `get_timeline` tool produces data for the timeline panel in the HTML board:

```typescript
{
  entries: [
    {
      date: "2025-06-15",
      type: "milestone",
      summary: "Initial documentation",
      milestone_name: "initial-documentation",
      details_count: 0
    },
    {
      date: "2025-06-20",
      type: "change",
      summary: "Updated DB schema (+2 tables), added auth flow diagram",
      details_count: 5
    },
    {
      date: "2025-06-20",
      type: "decision",
      summary: "Chose PostgreSQL over MongoDB",
      decision_title: "Chose PostgreSQL over MongoDB"
    },
    {
      date: "2025-07-01",
      type: "change",
      summary: "Added security layer map, updated architecture diagram",
      details_count: 8
    },
    {
      date: "2025-08-01",
      type: "milestone",
      summary: "v2.0 Launch",
      milestone_name: "v2-launch",
      details_count: 0
    }
  ]
}
```

Granularity options:
- `day` — one entry per day with changes
- `week` — aggregated by week
- `month` — aggregated by month

---

## Common Queries Claude Code Will Make

| Question | Tool Call |
|---|---|
| "How did the auth system evolve?" | `get_element_history(element_id: auth_flow_id)` |
| "What did the system look like before the refactor?" | `get_snapshot(milestone: "pre-refactor")` |
| "Why did we choose this approach?" | `get_decisions(element_id: relevant_element)` |
| "What changed in the last month?" | `get_history(from_date: "2025-07-01")` |
| "Show me the diff since v2 launch" | `compare_snapshots(from: "v2-launch", to: current_version)` |
| "What's the project evolution timeline?" | `get_timeline(granularity: "month")` |
