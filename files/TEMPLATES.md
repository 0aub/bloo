# Bloo Visual Templates

This file defines how each element type is rendered visually. The renderer uses these rules to produce consistent, readable diagrams.

**Important:** All colors, glow effects, typography, and animations are defined in `BRANDING.md`. This file references those values. Always consult BRANDING.md for the exact HSL values and CSS patterns.

---

## Color System

### Category Colors

| Category | Primary | Light | Border |
|---|---|---|---|
| system_structure | `#3B82F6` (blue) | `#EFF6FF` | `#93C5FD` |
| data_layer | `#10B981` (green) | `#ECFDF5` | `#6EE7B7` |
| api_integration | `#8B5CF6` (purple) | `#F5F3FF` | `#C4B5FD` |
| security | `#EF4444` (red) | `#FEF2F2` | `#FCA5A5` |
| infrastructure | `#F59E0B` (amber) | `#FFFBEB` | `#FCD34D` |
| user_flows | `#06B6D4` (cyan) | `#ECFEFF` | `#67E8F9` |
| processes | `#EC4899` (pink) | `#FDF2F8` | `#F9A8D4` |
| project_meta | `#6B7280` (gray) | `#F9FAFB` | `#D1D5DB` |

### Component Type Colors (Architecture Diagrams)

| Type | Color | Shape |
|---|---|---|
| service | `#3B82F6` | Rounded rectangle |
| database | `#10B981` | Cylinder |
| queue | `#F59E0B` | Parallelogram |
| cache | `#EF4444` | Diamond |
| client | `#8B5CF6` | Rectangle |
| external | `#6B7280` | Dashed rectangle |
| gateway | `#06B6D4` | Hexagon |
| worker | `#EC4899` | Rectangle with gear icon |
| storage | `#10B981` | Folder shape |
| cdn | `#F59E0B` | Cloud shape |
| load_balancer | `#06B6D4` | Triangle |
| container | `#6B7280` | Dashed rounded rect (groups children) |

### Note Colors

| Name | Background | Border | Text |
|---|---|---|---|
| yellow | `#FEF9C3` | `#FDE047` | `#713F12` |
| blue | `#DBEAFE` | `#93C5FD` | `#1E3A8A` |
| green | `#DCFCE7` | `#86EFAC` | `#14532D` |
| pink | `#FCE7F3` | `#F9A8D4` | `#831843` |
| orange | `#FFEDD5` | `#FDBA74` | `#7C2D12` |
| purple | `#F3E8FF` | `#C4B5FD` | `#581C87` |

---

## Diagram Rendering Rules

### Architecture Diagram

**Layout:** Force-directed or layered. If `layers` are provided, use layered layout with horizontal swim lanes.

**Components:** Each renders as its icon shape with name centered, technology in smaller text below. Min size: 120x60px.

**Connections:** Solid lines for sync, dashed for async. Arrow at target. Label centered on line with background pill. Protocol/format in smaller text below.

**Spacing:** 60px min between components, 40px padding within layers.

---

### DB Schema (ERD)

**Layout:** Grid or force-directed. Related tables placed closer.

**Tables:** Card with dark header (table name), rows for columns. Primary key: key icon + bold. Foreign key: link icon. Nullable: italic. Unique: underline. Indexes in footer.

**Relationships:** Crow's foot notation connecting FK to PK. `one_to_one`: bars. `one_to_many`: bar + crow's foot. `many_to_many`: crow's feet. Min table width: 200px.

---

### Page Map

**Layout:** Tree or graph depending on complexity.

**Pages:** Screen-shaped rectangles. Title bar with name + route. Auth badge if auth_required. Role chips below. Modals rendered smaller with shadow.

**Navigation:** Solid arrows with trigger label. Conditional = dashed + condition text.

---

### Flow Chart

**Layout:** Top-to-bottom directed graph.

**Nodes:** start/end = oval (green/red). process = rectangle. decision = diamond. io = parallelogram. subprocess = double-bordered rectangle. delay = half-oval. loop = rectangle + loop icon.

**Edges:** Arrows with label. Decision edges: "yes" green, "no" red. Error paths: red dashed.

---

### API Map

**Layout:** Grouped cards per resource.

**Endpoints:** Method badge (GET=green, POST=blue, PUT=orange, PATCH=yellow, DELETE=red, WS=purple, SSE=cyan, GRAPHQL=pink). Path in monospace. Auth lock icon.

---

### Sequence Diagram

**Layout:** Standard UML sequence.

**Actors:** Top row boxes with lifelines. Messages as horizontal arrows in order. Solid=sync, dashed=async, dotted=response. Self-messages as loop arrows. Notes as yellow callouts.

---

### File Tree

**Layout:** Indented tree (VS Code style).

Directories: folder icon + bold. Files: file icon + technology color. Highlighted entries: light background. Descriptions in gray to the right. Tree lines connecting parent to children.

---

### Dependency Graph

**Layout:** Force-directed.

Internal: solid blue. External: dashed gray. DevDependency: dotted lighter gray. Version in small text. Arrows from dependent to dependency.

---

### Security Layer Map

**Layout:** Concentric nested rectangles (onion skin). Layer 0 outermost.

Each layer: rounded rectangle with name + technology on border. Semi-transparent fill, gradient red/amber (outer) to green (inner). Flow arrows showing request path through layers.

---

### CI/CD Pipeline

**Layout:** Left-to-right horizontal flow.

Stages as vertical cards/columns. Steps listed as rows. Parallel stages side by side. Trigger badge at left. Environment tags colored (staging=yellow, production=red). Chevron arrows between stages.

---

### Environment Map

**Layout:** Left-to-right (dev → prod).

Environments as large cards. Services as small boxes inside. Database as cylinder. URL at top. Infrastructure badge at bottom. Promotion arrows with method label.

---

### Permission Matrix

**Layout:** Table/grid.

Roles as columns. Resources as rows. Cells: permission badges (read=green, write=blue, delete=red, none=gray).

---

### Tech Stack

**Layout:** Grouped vertical columns per category.

Technologies as cards: name (bold), version (small), purpose. Link icon for URL.

---

### Notes & Text Blocks

**Notes:** Tilted sticky note with shadow. Colored background. Priority flag in corner.

**Text blocks:** White card with rendered markdown.

---

### Badges

Small pill-shaped labels. Free-floating or attached to an element corner.

---

## Section Rendering

Sections = large frames (Miro-style). Rounded rectangle in section color. Title + category icon at top-left. Collapse/expand at top-right. Sub-sections nested inside. Light category color background. Collapsed = title bar only + element count badge.

---

## Board-Level Layout

Sections auto-arranged by category (system_structure top, data below, etc.). Cross-section connections curve around borders. Cross-references as thin dotted lines. Board links as external link badges at edge. Minimap bottom-right. Timeline panel collapsible from bottom.
