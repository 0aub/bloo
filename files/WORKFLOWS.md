# Bloo Workflows

Step-by-step workflows for Claude Code to follow when using Bloo. These ensure comprehensive, consistent documentation.

---

## Workflow 1: Document a New Project from Scratch

Use when: No Bloo documentation exists for the project.

### Phase 1: Initialize

```
1. create_board(name, project_path, description)
2. Save the board_id for all subsequent calls
```

### Phase 2: Analyze Codebase

Before adding anything, Claude Code should analyze:

- **Project structure:** Read package.json/pyproject.toml, directory structure, monorepo layout
- **Tech stack:** Identify frameworks, languages, libraries, tools
- **Database:** Find schema files, migrations, ORM models
- **Routes/pages:** Find route definitions, page components, navigation
- **API:** Find endpoint definitions, controllers, resolvers
- **Auth/security:** Find auth middleware, RBAC config, security headers
- **CI/CD:** Find workflow files (.github/workflows, Dockerfile, docker-compose, etc.)
- **Config:** Find env files, config modules, feature flags
- **Tests:** Find test structure and coverage config

### Phase 3: Build Sections and Diagrams

Follow this order for comprehensive coverage:

```
Step 1: Project Meta
  add_section(category: "project_meta", title: "Project Overview")
  add_element(type: "tech_stack", ...)
  add_element(type: "file_tree", ...)
  add_element(type: "text_block", ...)   // Project description, key decisions

Step 2: System Structure
  add_section(category: "system_structure", title: "System Architecture")
  add_element(type: "architecture_diagram", ...)
  add_element(type: "dependency_graph", ...)

Step 3: Data Layer
  add_section(category: "data_layer", title: "Database & Data")
  add_element(type: "db_schema", ...)
  add_element(type: "flow_chart", ...)   // Data flow diagram
  add_element(type: "note", ...)         // Cache strategy notes

Step 4: API & Integration
  add_section(category: "api_integration", title: "API & Integrations")
  add_element(type: "api_map", ...)
  add_element(type: "sequence_diagram", ...)  // Key request flows
  add_element(type: "note", ...)              // External service notes

Step 5: Security
  add_section(category: "security", title: "Security")
  add_element(type: "security_layer_map", ...)
  add_element(type: "flow_chart", ...)        // Auth flow
  add_element(type: "permission_matrix", ...)
  add_element(type: "note", ...)              // Secret management notes

Step 6: Infrastructure
  add_section(category: "infrastructure", title: "Infrastructure & DevOps")
  add_element(type: "environment_map", ...)
  add_element(type: "cicd_pipeline", ...)
  add_element(type: "note", ...)              // Monitoring/alerting notes

Step 7: User Flows
  add_section(category: "user_flows", title: "Pages & User Flows")
  add_element(type: "page_map", ...)
  add_element(type: "flow_chart", ...)        // Key user journeys

Step 8: Processes
  add_section(category: "processes", title: "Business Logic & Processes")
  add_element(type: "flow_chart", ...)        // Core business logic
  add_element(type: "sequence_diagram", ...)  // Background job flows
  add_element(type: "note", ...)              // Error handling strategy
```

### Phase 4: Add Connections and Cross-References

```
Step 9: Connect related elements
  add_connection(...)                // API endpoint → database table
  add_connection(...)                // Service → service
  add_cross_reference(...)           // Auth flow → permission matrix
  add_cross_reference(...)           // API map → sequence diagrams
  add_cross_reference(...)           // CI/CD → environment map
```

### Phase 5: Finalize

```
Step 10: Record decisions and milestone
  add_decision(...)                  // Key architectural decisions found in code
  add_milestone("initial-documentation", "Initial comprehensive documentation")
  export_board(format: "html")
```

---

## Workflow 2: Update Existing Documentation

Use when: Documentation exists but codebase has changed.

```
1. get_board(board_id)                    // Read current state
2. board_health_report(board_id)          // Find gaps and stale items

3. For each stale element:
   - Re-analyze the relevant code
   - update_element(element_id, new_data, reason: "Updated because...")

4. For new features/modules:
   - add_element(..., reason: "New feature: ...")
   - add_connection/cross_reference as needed

5. For removed features:
   - remove_element(element_id, reason: "Removed because...")

6. export_board(format: "html")
```

**Always provide a `reason` for every change** — this builds the changelog.

---

## Workflow 3: Document a Specific Concern

Use when: User asks to document just one area (e.g., "document the security layer").

```
1. get_board(board_id)                    // Check if section exists
2. search_board(category: "security")     // Find existing security docs

3. If section exists:
   - update_element(...) for each outdated element
   - add_element(...) for missing elements
   
   If section doesn't exist:
   - add_section(category: "security", title: "Security")
   - add_element(type: "security_layer_map", ...)
   - add_element(type: "flow_chart", ...)         // Auth flow
   - add_element(type: "permission_matrix", ...)
   - add_cross_reference(...)                     // Link to related elements

4. export_board(format: "html")
```

---

## Workflow 4: Compare Project Versions

Use when: User wants to see what changed between milestones.

```
1. compare_snapshots(from: "v1-launch", to: "v2-launch")
2. get_decisions(status: "accepted")      // Get decisions made between versions
3. get_timeline(granularity: "week")      // Get change timeline

4. Optionally export a diff report:
   export_board(format: "markdown")       // For README/documentation
```

---

## Workflow 5: Multi-Project Documentation

Use when: Multiple related projects need cross-referencing.

```
For each project:
1. create_board(name, project_path)
2. Follow Workflow 1 for full documentation

Then cross-link:
3. For each inter-project dependency:
   add_board_link(board_id, target_board_id, label, element_id)
```

---

## Workflow 6: Continuous Documentation (Recommended)

Integrate Bloo into the development cycle:

```
After every significant code change:
1. get_board(board_id)
2. board_health_report(board_id)
3. Update stale elements with reasons
4. Add new elements for new features
5. Log any architectural decisions
6. export_board(format: "html")

At each release/milestone:
7. add_milestone(name, description)

Periodically:
8. validate_board(board_id)              // Check data integrity
9. board_health_report(board_id)          // Ensure coverage
```

---

## Best Practices for Claude Code

1. **Always use `reason`** — every add/update/remove should explain why. This is the project's memory.

2. **Use bulk operations** — when adding many tables or endpoints, use `bulk_add_elements` instead of calling `add_element` repeatedly.

3. **Cross-reference aggressively** — link related elements across sections. An API endpoint should reference its DB tables, auth requirements, and deployment environment.

4. **Tag meaningfully** — use tags like `critical`, `tech-debt`, `needs-review`, `v2`, `experimental`. This enables filtering.

5. **Add decisions for non-obvious choices** — if the code makes a choice that isn't self-evident (using Redis over Memcached, choosing REST over GraphQL), log it with `add_decision`.

6. **Start broad, then detail** — add the architecture diagram first, then drill into each component. Don't start with DB schemas before the big picture exists.

7. **Keep notes conversational** — sticky notes should read like a team member explaining something. "We use Redis here because the session data needs sub-ms reads and we don't care about persistence."

8. **Group related changes** — when updating multiple elements for one feature, use the same reason string so the changelog groups them logically.

9. **Check health before exporting** — always run `board_health_report` before `export_board` to catch gaps.

10. **Milestone at meaningful points** — not every update needs a milestone. Use them for releases, major refactors, architecture changes, and before risky modifications.
