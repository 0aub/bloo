# Bloo Rendering Engine

The rendering engine converts board JSON data into a self-contained interactive HTML file. Zero external dependencies — everything is inlined.

---

## Output Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{board.name} — Bloo</title>
  <style>/* All CSS inlined */</style>
</head>
<body>
  <header id="board-header">
    <!-- Board name, search toggle, zoom controls, theme toggle, export info -->
  </header>

  <div id="board-canvas">
    <svg id="board-svg">
      <!-- All sections and elements rendered as SVG -->
    </svg>
  </div>

  <div id="minimap">
    <canvas id="minimap-canvas"></canvas>
  </div>

  <div id="timeline-panel"><!-- Collapsible from bottom --></div>
  <div id="search-panel"><!-- Collapsible from top-right --></div>

  <script id="board-data" type="application/json">
    {/* Full board JSON for interactivity */}
  </script>
  <script>{/* d3.min.js inlined */}</script>
  <script>{/* board.js inlined */}</script>
</body>
</html>
```

---

## Canvas: Pan & Zoom

SVG transforms via D3.js zoom behavior:
- Scale extent: 0.1 to 4 (10%–400%)
- Mouse wheel / trackpad pinch: zoom
- Click + drag: pan
- Double-click: zoom to fit
- Keyboard: +/- zoom, arrow keys pan
- Zoom indicator in header
- "Fit all" button resets view

---

## Rendering Pipeline

### Step 1: Layout Calculation

Position elements/sections that lack explicit coordinates:

**Section placement** — arranged by category in a logical grid:
```
┌──────────────────┐  ┌──────────────────┐
│ System Structure  │  │ Project Meta     │
├──────────────────┤  ├──────────────────┤
│ Data Layer        │  │ API & Integration│
├──────────────────┤  ├──────────────────┤
│ Security          │  │ Infrastructure   │
├──────────────────┤  ├──────────────────┤
│ User Flows        │  │ Processes        │
└──────────────────┘  └──────────────────┘
```

**Element placement** — per section layout type (grid, tree, force, etc.)

**Section sizing** — auto-sized to contain elements with padding.

**Connection routing** — curved paths avoiding section overlap.

### Step 2: SVG Generation

Each element type has a dedicated renderer:
```typescript
interface DiagramRenderer {
  render(element: Element, theme: Theme): SVGElement;
  calculateSize(element: Element): Size;
}
```

Render order: section backgrounds → elements → connections → cross-references → badges.

### Step 3: Interactivity

JavaScript adds click/hover handlers, search, timeline, minimap.

### Step 4: Bundle

Inline all CSS, JS, D3.js, SVG into single HTML file.

---

## Interactive Features

### Section Collapse/Expand
Click section header to toggle. Collapsed = title bar + element count badge. Animated transitions.

### Element Tooltip
Hover shows: name, type, description, tags, last updated, stats.

### Connection Highlighting
Click element → highlight all its connections (thicker, colored), dim everything else. Click canvas to clear.

### Search Panel
Top-right collapsible panel:
- Text search across names, descriptions, content
- Filter by type, category, tag
- Click result → pan/zoom to element + highlight

### Timeline Panel
Bottom collapsible panel:
- Horizontal timeline with date markers
- Milestone markers (named), decision markers (diamonds)
- Change density as bar heights
- Click milestone → overlay that snapshot's state
- Filter by category

### Minimap
Bottom-right corner:
- Scaled-down view of all sections
- Viewport rectangle overlay (draggable)
- Real-time updates on pan/zoom

---

## Theme System

See `BRANDING.md` for the complete color system, glow effects, typography, animations, and CSS patterns.

The board uses Bloo's dark theme by default with the emerald/mint glow aesthetic. The canvas has a subtle dot grid background with radial emerald gradients. All cards use the glass-card pattern (semi-transparent background + backdrop-blur + glow on hover).

### Light Theme (Default)
```css
--bg-canvas: hsl(150 10% 97%);  --bg-primary: hsl(0 0% 100%);
--text-primary: hsl(160 20% 9%);  --glow: hsl(152 55% 45%);
```

### Dark Theme
```css
--bg-canvas: hsl(160 15% 7%);  --bg-primary: hsl(160 10% 10%);
--text-primary: hsl(0 0% 95%);  --glow: hsl(152 65% 55%);
```

Toggle in header. Stored in localStorage.

---

## Typography

```css
--font-primary: 'Almarai', 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-size-xs: 10px;  --font-size-sm: 12px;
--font-size-md: 14px;  --font-size-lg: 16px;  --font-size-xl: 20px;
```

The exported HTML must import Almarai and Inter from Google Fonts (see BRANDING.md for the link). For offline exports, fonts are inlined as base64.

---

## Export Formats

### Markdown
Structured markdown with tables for DB schemas, lists for components, etc.

### Mermaid
Architecture → `graph TD`. Flow charts → `flowchart TD`. Sequences → `sequenceDiagram`. ERD → `erDiagram`. Elements without Mermaid equivalent → markdown.

### PNG / SVG
SVG: direct output with embedded styles. PNG: headless rasterization via sharp or puppeteer.

---

## Performance

- SVG `<g>` per section for efficient show/hide
- Collapsed sections: children removed from DOM
- `requestAnimationFrame` for smooth pan/zoom
- Minimap on debounced canvas render
- Search index built once on load
- D3 force layouts pre-calculated at export time (positions fixed in SVG)
