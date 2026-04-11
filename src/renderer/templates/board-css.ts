export const BOARD_CSS = `
/* === Bloo Board — Free-form Canvas === */

:root {
  --bg: hsl(160 15% 7%);
  --bg-card: hsl(160 10% 10%);
  --bg-elevated: hsl(160 8% 13%);
  --fg: hsl(0 0% 95%);
  --fg-muted: hsl(155 5% 55%);
  --primary: hsl(155 65% 30%);
  --accent: hsl(152 65% 55%);
  --border: hsl(160 8% 18%);
  --border-hover: hsl(155 15% 25%);
  --font: 'Almarai', 'Inter', system-ui, sans-serif;
  --mono: 'JetBrains Mono', 'Fira Code', monospace;
}
[data-theme="light"] {
  --bg: hsl(150 10% 97%);
  --bg-card: hsl(0 0% 100%);
  --bg-elevated: hsl(150 6% 94%);
  --fg: hsl(160 20% 9%);
  --fg-muted: hsl(155 8% 45%);
  --primary: hsl(155 60% 28%);
  --accent: hsl(152 55% 45%);
  --border: hsl(150 8% 85%);
  --border-hover: hsl(155 12% 78%);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
  height: 100vh;
  width: 100vw;
}

/* Header */
.bloo-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: hsl(160 10% 8% / 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 8px 20px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; height: 44px;
}
[data-theme="light"] .bloo-header { background: hsl(150 10% 97% / 0.95); }
.header-left { display: flex; align-items: center; gap: 10px; }
.header-right { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; }
.toolbar { display: flex; align-items: center; gap: 2px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
.tool-btn {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; border-radius: 6px;
  color: var(--fg-muted); cursor: pointer;
  font-size: 14px; line-height: 1;
  transition: all 0.12s;
}
.tool-btn:hover { background: var(--bg-elevated); color: var(--fg); }
.tool-btn.edit-active { background: var(--accent); color: var(--bg); }
.tool-sep { width: 1px; height: 18px; background: var(--border); margin: 0 2px; }
.board-title {
  font-size: 16px; font-weight: 800;
  background: linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.board-subtitle { color: var(--fg-muted); font-size: 12px; }
.board-version { color: var(--fg-muted); font-size: 11px; font-family: var(--mono); }
.zoom-display { color: var(--fg-muted); font-size: 11px; font-family: var(--mono); min-width: 36px; text-align: center; }

/* Canvas wrapper — handles pan via scroll */
.canvas-wrapper {
  position: fixed;
  top: 44px; left: 0; right: 0; bottom: 0;
  overflow: auto;
  background: var(--bg);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.2s ease-in;
}
.canvas-wrapper.ready { opacity: 1; }
.canvas-wrapper:active { cursor: grabbing; }

/* Dot grid background */
.canvas-wrapper::before {
  content: '';
  position: fixed;
  top: 44px; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  opacity: 0.15;
  background-image: radial-gradient(circle, var(--border) 1px, transparent 1px);
  background-size: 24px 24px;
  z-index: 0;
}

/* Canvas — the zoomable surface */
.canvas {
  position: relative;
  transform-origin: 0 0;
  min-width: 100%;
  min-height: 100%;
}

/* Card — absolute positioned, draggable */
.bloo-card {
  position: absolute;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  cursor: grab;
  transition: box-shadow 0.15s, border-color 0.15s;
  z-index: 1;
}
.bloo-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 24px -4px hsl(152 65% 55% / 0.12);
  z-index: 5;
}
.bloo-card.dragging {
  opacity: 0.9;
  box-shadow: 0 8px 32px -4px hsl(0 0% 0% / 0.4);
  z-index: 50;
  cursor: grabbing;
  transition: none;
}

/* Section label — draggable/resizable group frame */
.section-label {
  position: absolute;
  z-index: 0;
  border-radius: 12px;
  border: 1.5px dashed var(--border);
  background: hsl(152 65% 55% / 0.02);
  padding: 8px 14px;
  cursor: grab;
  transition: border-color 0.15s;
}
.section-label:hover { border-color: var(--accent); }
.section-label.dragging { cursor: grabbing; opacity: 0.8; }
.section-label .label-text {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: var(--fg-muted); opacity: 0.6;
  pointer-events: none;
}
.section-label .resize-handle { position: absolute; bottom: 0; right: 0; }

/* Card header */
.card-header {
  padding: 8px 12px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}
.card-name { font-size: 12px; font-weight: 600; }
.card-type {
  font-size: 9px; font-family: var(--mono); color: var(--accent);
  background: hsl(152 65% 55% / 0.08); padding: 1px 6px; border-radius: 4px;
  flex-shrink: 0;
}

/* Card body */
.card-body {
  padding: 10px;
  overflow: hidden;
}
.card-body svg { display: block; max-width: 100%; height: auto; }
.card-desc { color: var(--fg-muted); font-size: 11px; margin-bottom: 8px; line-height: 1.5; }

/* Note card (special) */
.note-inner {
  padding: 10px 14px;
  border-left: 3px solid;
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  line-height: 1.6;
}
.note-inner.yellow { background: hsl(38 50% 15%); border-color: hsl(38 70% 45%); color: hsl(38 60% 70%); }
.note-inner.blue { background: hsl(210 40% 15%); border-color: hsl(210 50% 45%); color: hsl(210 40% 70%); }
.note-inner.green { background: hsl(152 40% 15%); border-color: hsl(152 50% 40%); color: hsl(152 40% 70%); }
.note-inner.pink { background: hsl(340 35% 15%); border-color: hsl(340 45% 50%); color: hsl(340 40% 70%); }
.note-inner.orange { background: hsl(25 50% 15%); border-color: hsl(25 70% 50%); color: hsl(25 55% 70%); }
.note-inner.purple { background: hsl(280 35% 15%); border-color: hsl(280 40% 50%); color: hsl(280 35% 70%); }
[data-theme="light"] .note-inner.yellow { background: hsl(45 100% 96%); border-color: hsl(38 80% 55%); color: hsl(38 50% 25%); }
[data-theme="light"] .note-inner.blue { background: hsl(210 90% 96%); border-color: hsl(210 60% 55%); color: hsl(210 40% 25%); }
[data-theme="light"] .note-inner.green { background: hsl(152 60% 96%); border-color: hsl(152 55% 45%); color: hsl(152 40% 20%); }
[data-theme="light"] .note-inner.pink { background: hsl(340 80% 97%); border-color: hsl(340 55% 55%); color: hsl(340 40% 25%); }
[data-theme="light"] .note-inner.orange { background: hsl(30 90% 96%); border-color: hsl(25 80% 55%); color: hsl(25 50% 25%); }
[data-theme="light"] .note-inner.purple { background: hsl(280 70% 97%); border-color: hsl(280 50% 55%); color: hsl(280 35% 25%); }
/* Note structured items */
.note-item {
  display: flex; gap: 10px; padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.note-item:last-child { border-bottom: none; }
[data-theme="light"] .note-item { border-bottom-color: rgba(0,0,0,0.06); }
.note-item-key {
  font-weight: 700; font-size: 11px; min-width: 80px; flex-shrink: 0;
  opacity: 0.85; padding-top: 1px;
}
.note-item-num {
  font-weight: 700; font-size: 11px; width: 22px; height: 22px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border-radius: 50%;
}
[data-theme="light"] .note-item-num { background: rgba(0,0,0,0.06); }
.note-item-val { font-size: 12px; line-height: 1.6; flex: 1; text-align: justify; }
.note-item-full { font-size: 12px; line-height: 1.6; width: 100%; text-align: justify; }
.note-prose { font-size: 12px; line-height: 1.7; text-align: justify; }

.note-priority {
  display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase;
  padding: 1px 8px; border-radius: 3px; margin-bottom: 6px;
}
.note-priority.high { background: hsl(0 60% 20%); color: hsl(0 85% 65%); }
.note-priority.medium { background: hsl(38 50% 20%); color: hsl(38 80% 65%); }
.note-priority.low { background: hsl(152 40% 18%); color: hsl(152 55% 60%); }
[data-theme="light"] .note-priority.high { background: hsl(0 70% 92%); color: hsl(0 70% 40%); }
[data-theme="light"] .note-priority.medium { background: hsl(38 70% 92%); color: hsl(38 60% 35%); }
[data-theme="light"] .note-priority.low { background: hsl(152 50% 92%); color: hsl(152 40% 30%); }

/* Text block */
.text-block-inner {
  font-size: 12px; line-height: 1.7; color: var(--fg);
  overflow: visible; text-align: justify;
  padding: 4px;
}

/* Light theme SVG adjustments — target specific elements by attribute selectors */
/* Dark backgrounds become light */
[data-theme="light"] .card-body svg [fill="hsl(160 10% 10%)"] { fill: hsl(0 0% 100%); }
[data-theme="light"] .card-body svg [fill="hsl(160 10% 10% / 0.8)"] { fill: hsl(0 0% 100%); }
[data-theme="light"] .card-body svg [fill="hsl(160 8% 13%)"] { fill: hsl(150 6% 94%); }
[data-theme="light"] .card-body svg [fill="hsl(160 15% 7%)"] { fill: hsl(150 10% 97%); }
/* Light text becomes dark */
[data-theme="light"] .card-body svg [fill="hsl(0 0% 95%)"] { fill: hsl(160 20% 9%); }
/* Muted text adjusts */
[data-theme="light"] .card-body svg [fill="hsl(155 5% 55%)"] { fill: hsl(155 8% 40%); }
/* Borders adjust */
[data-theme="light"] .card-body svg [stroke="hsl(160 8% 18%)"] { stroke: hsl(150 8% 82%); }
[data-theme="light"] .card-body svg [stroke="hsl(155 5% 35%)"] { stroke: hsl(155 10% 60%); }
/* Connection lines */
[data-theme="light"] .card-body svg [fill="hsl(155 5% 35%)"] { fill: hsl(155 10% 60%); }
/* Component type backgrounds: lighten dark fills */
[data-theme="light"] .card-body svg [fill="hsl(200 50% 15%)"] { fill: hsl(200 40% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(152 40% 15%)"] { fill: hsl(152 35% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(35 50% 15%)"] { fill: hsl(35 40% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(0 40% 15%)"] { fill: hsl(0 35% 94%); }
[data-theme="light"] .card-body svg [fill="hsl(280 30% 15%)"] { fill: hsl(280 25% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(155 5% 15%)"] { fill: hsl(155 5% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(180 30% 15%)"] { fill: hsl(180 25% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(320 30% 15%)"] { fill: hsl(320 25% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(152 35% 15%)"] { fill: hsl(152 30% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(35 45% 15%)"] { fill: hsl(35 40% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(180 35% 15%)"] { fill: hsl(180 30% 92%); }
/* Flow chart node fills */
[data-theme="light"] .card-body svg [fill="hsl(200 40% 15%)"] { fill: hsl(200 35% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(152 40% 15%)"] { fill: hsl(152 35% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(0 40% 15%)"] { fill: hsl(0 35% 94%); }
[data-theme="light"] .card-body svg [fill="hsl(38 50% 15%)"] { fill: hsl(38 45% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(280 30% 15%)"] { fill: hsl(280 25% 93%); }
/* Dependency graph */
[data-theme="light"] .card-body svg [fill="hsl(200 40% 13%)"] { fill: hsl(200 35% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(155 5% 12%)"] { fill: hsl(155 5% 94%); }
[data-theme="light"] .card-body svg [fill="hsl(155 5% 10%)"] { fill: hsl(155 5% 95%); }
/* Note/sequence note backgrounds */
[data-theme="light"] .card-body svg [fill="hsl(38 50% 15%)"] { fill: hsl(38 60% 94%); }
/* Method/permission badge backgrounds (all 15% lightness fills) */
[data-theme="light"] .card-body svg [fill="hsl(210 40% 15%)"] { fill: hsl(210 40% 90%); }
[data-theme="light"] .card-body svg [fill="hsl(50 45% 15%)"] { fill: hsl(50 45% 90%); }
[data-theme="light"] .card-body svg [fill="hsl(320 35% 15%)"] { fill: hsl(320 35% 90%); }
/* Security map layer fills (12% lightness gradient) */
[data-theme="light"] .card-body svg [fill="hsl(0 40% 12%)"] { fill: hsl(0 35% 94%); }
[data-theme="light"] .card-body svg [fill="hsl(20 45% 12%)"] { fill: hsl(20 40% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(38 45% 12%)"] { fill: hsl(38 40% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(65 40% 12%)"] { fill: hsl(65 35% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(100 35% 12%)"] { fill: hsl(100 30% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(130 35% 12%)"] { fill: hsl(130 30% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(152 40% 12%)"] { fill: hsl(152 35% 93%); }
/* Semi-transparent overlays */
[data-theme="light"] .card-body svg [fill="hsl(160 10% 10% / 0.4)"] { fill: hsl(150 8% 90% / 0.4); }
[data-theme="light"] .card-body svg [fill="hsl(152 40% 15% / 0.3)"] { fill: hsl(152 40% 80% / 0.3); }
/* Dependency graph and env map backgrounds */
[data-theme="light"] .card-body svg [fill="hsl(200 40% 12%)"] { fill: hsl(200 35% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(200 50% 18%)"] { fill: hsl(200 40% 88%); }
/* Page map dark fills */
[data-theme="light"] .card-body svg [fill="hsl(152 65% 55% / 0.08)"] { fill: hsl(152 55% 45% / 0.12); }
/* Docker/environment tier fills */
[data-theme="light"] .card-body svg [fill="hsl(210 40% 12%)"] { fill: hsl(210 35% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(35 40% 12%)"] { fill: hsl(35 35% 93%); }
[data-theme="light"] .card-body svg [fill="hsl(152 35% 12%)"] { fill: hsl(152 30% 93%); }
/* Muted fill/stroke for better visibility */
[data-theme="light"] .card-body svg [fill="hsl(155 5% 40%)"] { fill: hsl(155 8% 70%); }
[data-theme="light"] .card-body svg [stroke="hsl(155 5% 30%)"] { stroke: hsl(155 8% 75%); }
/* Make connection strokes more visible on light background */
[data-theme="light"] .card-body svg [stroke="hsl(155 5% 35%)"] { stroke: hsl(155 15% 50%); }
/* Sequence diagram lifelines */
[data-theme="light"] .card-body svg [stroke="hsl(160 8% 18%)" ] { stroke: hsl(150 8% 82%); }
/* Wildcard: any remaining very dark fills (catch-all for 10-15% lightness) */
[data-theme="light"] .card-body svg [fill="hsl(280 35% 15%)"] { fill: hsl(280 30% 90%); }
[data-theme="light"] .card-body svg [fill="hsl(0 60% 20%)"] { fill: hsl(0 50% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(38 50% 20%)"] { fill: hsl(38 45% 92%); }
[data-theme="light"] .card-body svg [fill="hsl(152 40% 18%)"] { fill: hsl(152 35% 92%); }
/* DB schema alternating row background */
[data-theme="light"] .card-body svg [fill="hsl(160 8% 11%)"] { fill: hsl(150 6% 95%); }
/* Sequence diagram: white arrowhead fills need to become dark on light bg */
[data-theme="light"] .card-body svg marker [fill="hsl(0 0% 95%)"] { fill: hsl(160 20% 9%); }
[data-theme="light"] .card-body svg [stroke="hsl(0 0% 95%)"] { stroke: hsl(160 20% 30%); }
/* Sequence diagram: muted message lines need more contrast on light bg */
[data-theme="light"] .card-body svg [stroke="hsl(155 5% 55%)"] { stroke: hsl(155 10% 40%); }

/* SVG interactivity */
svg .hoverable { cursor: pointer; transition: opacity 0.15s, filter 0.15s; }
svg .hoverable:hover { filter: brightness(1.2); }
svg .dimmed { opacity: 0.15; transition: opacity 0.3s; }
svg .highlighted-conn { stroke-width: 3 !important; filter: drop-shadow(0 0 6px var(--accent)); }
svg .highlighted-node { filter: drop-shadow(0 0 8px var(--accent)) brightness(1.2); }

/* Edit mode toggle — handled by .tool-btn.edit-active */

/* Resize handles — only visible in edit mode */
.resize-handle { display: none; }
body.edit-mode .resize-handle {
  display: block;
  position: absolute;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.15s;
}
body.edit-mode .bloo-card:hover .resize-handle,
body.edit-mode .section-label:hover .resize-handle { opacity: 1; }

/* Side handles: thin bars */
.resize-handle.rh-tm, .resize-handle.rh-bm {
  width: 24px; height: 3px;
  background: var(--accent);
  border-radius: 2px;
  left: 50%; margin-left: -12px;
  cursor: ns-resize;
}
.resize-handle.rh-tm { top: -2px; }
.resize-handle.rh-bm { bottom: -2px; }
.resize-handle.rh-ml, .resize-handle.rh-mr {
  width: 3px; height: 24px;
  background: var(--accent);
  border-radius: 2px;
  top: 50%; margin-top: -12px;
  cursor: ew-resize;
}
.resize-handle.rh-ml { left: -2px; }
.resize-handle.rh-mr { right: -2px; }

/* Corner handles: L-shaped brackets */
.resize-handle.rh-tl, .resize-handle.rh-tr, .resize-handle.rh-bl, .resize-handle.rh-br {
  width: 12px; height: 12px;
  background: none;
}
.resize-handle.rh-tl { top: -2px; left: -2px; cursor: nwse-resize; border-top: 3px solid var(--accent); border-left: 3px solid var(--accent); }
.resize-handle.rh-tr { top: -2px; right: -2px; cursor: nesw-resize; border-top: 3px solid var(--accent); border-right: 3px solid var(--accent); }
.resize-handle.rh-bl { bottom: -2px; left: -2px; cursor: nesw-resize; border-bottom: 3px solid var(--accent); border-left: 3px solid var(--accent); }
.resize-handle.rh-br { bottom: -2px; right: -2px; cursor: nwse-resize; border-bottom: 3px solid var(--accent); border-right: 3px solid var(--accent); }

/* In view mode, cards don't show grab cursor */
.bloo-card { cursor: default; }
.section-label { cursor: default; }
body.edit-mode .bloo-card { cursor: grab; }
body.edit-mode .section-label { cursor: grab; }
body.edit-mode .bloo-card.dragging { cursor: grabbing; }
body.edit-mode .section-label.dragging { cursor: grabbing; }

/* Edit mode indicator border */
body.edit-mode .canvas-wrapper { outline: 2px solid var(--accent); outline-offset: -2px; }

/* Search */
.search-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: hsl(0 0% 0% / 0.6); backdrop-filter: blur(4px);
  display: flex; flex-direction: column; align-items: center; padding-top: 80px;
}
.search-box { width: 90%; max-width: 600px; display: flex; gap: 8px; }
.search-box input {
  flex: 1; padding: 12px 16px;
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
  color: var(--fg); font-size: 16px; font-family: var(--font); outline: none;
}
.search-box input:focus { border-color: var(--accent); }
.search-box button {
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--fg); padding: 8px 16px; border-radius: 8px; cursor: pointer;
  font-family: var(--font);
}
.search-results {
  width: 90%; max-width: 600px; margin-top: 12px;
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;
  max-height: 60vh; overflow-y: auto;
}
.search-result {
  padding: 10px 16px; cursor: pointer;
  border-bottom: 1px solid hsl(160 8% 18% / 0.3);
  transition: background 0.1s;
}
.search-result:hover { background: var(--bg-elevated); }
.search-result .sr-name { font-weight: 500; font-size: 13px; }
.search-result .sr-type { color: var(--accent); font-size: 10px; font-family: var(--mono); margin-left: 6px; }
.search-result .sr-section { color: var(--fg-muted); font-size: 11px; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* Print container (hidden until print preview) */
#print-container {
  display: none;
  background: #e0e0e0;
  min-height: 100vh;
  padding: 20px;
  overflow-y: auto;
}
#print-container .print-page {
  width: 210mm; min-height: 297mm;
  padding: 14mm 16mm 18mm 16mm;
  position: relative; overflow: hidden;
  box-sizing: border-box;
  background: white; color: #111;
  margin: 0 auto 20px auto;
  box-shadow: 0 2px 16px rgba(0,0,0,0.15);
  font-family: 'Almarai', 'Inter', sans-serif;
}
#print-container .print-cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 265mm; position: relative; }
#print-container .print-cover-title { font-size: 42px; font-weight: 800; color: hsl(155 65% 30%); margin-bottom: 6px; }
#print-container .print-cover-subtitle { font-size: 16px; color: #666; margin-bottom: 24px; }
#print-container .print-cover-desc { font-size: 12px; color: #777; max-width: 140mm; line-height: 1.7; margin-bottom: 32px; text-align: justify; }
#print-container .print-cover-date { font-size: 13px; color: #888; }
#print-container .print-cover-brand { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8px; color: #ccc; letter-spacing: 1px; }
#print-container .print-header { display: flex; justify-content: space-between; padding-bottom: 6px; margin-bottom: 10px; border-bottom: 0.5px solid #ddd; font-size: 9px; color: #999; }
#print-container .print-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
#print-container .print-el-title { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 4px; text-align: center; }
#print-container .print-el-type { font-size: 10px; color: hsl(155 65% 30%); margin-bottom: 16px; text-align: center; font-family: 'JetBrains Mono', monospace; }
#print-container .print-el-body { max-width: 178mm; overflow: hidden; }
#print-container .print-el-body svg { max-width: 178mm; max-height: 220mm; width: auto; height: auto; display: block; margin: 0 auto; }
#print-container .print-footer { position: absolute; bottom: 10mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; border-top: 0.5px solid #eee; padding-top: 4px; }
/* Light SVG overrides in print preview */
#print-container svg [fill="hsl(160 10% 10%)"] { fill: white; }
#print-container svg [fill="hsl(160 10% 10% / 0.8)"] { fill: white; }
#print-container svg [fill="hsl(160 8% 13%)"] { fill: #f4f4f4; }
#print-container svg [fill="hsl(160 15% 7%)"] { fill: #fafafa; }
#print-container svg [fill="hsl(160 8% 11%)"] { fill: #f5f5f5; }
#print-container svg [fill="hsl(0 0% 95%)"] { fill: #111; }
#print-container svg [fill="hsl(155 5% 55%)"] { fill: #555; }
#print-container svg [fill="hsl(155 5% 35%)"] { fill: #777; }
#print-container svg [stroke="hsl(160 8% 18%)"] { stroke: #ddd; }
#print-container svg [stroke="hsl(155 5% 35%)"] { stroke: #999; }
#print-container svg [stroke="hsl(155 5% 55%)"] { stroke: #666; }
#print-container svg [stroke="hsl(0 0% 95%)"] { stroke: #333; }
#print-container svg [fill="hsl(200 50% 15%)"],#print-container svg [fill="hsl(200 40% 15%)"],#print-container svg [fill="hsl(152 40% 15%)"],#print-container svg [fill="hsl(35 50% 15%)"],#print-container svg [fill="hsl(35 45% 15%)"],#print-container svg [fill="hsl(0 40% 15%)"],#print-container svg [fill="hsl(280 30% 15%)"],#print-container svg [fill="hsl(280 35% 15%)"],#print-container svg [fill="hsl(155 5% 15%)"],#print-container svg [fill="hsl(180 30% 15%)"],#print-container svg [fill="hsl(180 35% 15%)"],#print-container svg [fill="hsl(320 30% 15%)"],#print-container svg [fill="hsl(320 35% 15%)"],#print-container svg [fill="hsl(152 35% 15%)"],#print-container svg [fill="hsl(210 40% 15%)"],#print-container svg [fill="hsl(50 45% 15%)"],#print-container svg [fill="hsl(38 50% 15%)"] { fill: hsl(0 0% 93%); }
#print-container svg [fill="hsl(0 40% 12%)"],#print-container svg [fill="hsl(20 45% 12%)"],#print-container svg [fill="hsl(38 45% 12%)"],#print-container svg [fill="hsl(65 40% 12%)"],#print-container svg [fill="hsl(100 35% 12%)"],#print-container svg [fill="hsl(130 35% 12%)"],#print-container svg [fill="hsl(152 40% 12%)"],#print-container svg [fill="hsl(200 40% 12%)"],#print-container svg [fill="hsl(200 40% 13%)"],#print-container svg [fill="hsl(155 5% 12%)"],#print-container svg [fill="hsl(155 5% 10%)"] { fill: hsl(0 0% 94%); }
#print-container .note-inner { color: #333; }
#print-container .note-inner.blue { background: hsl(210 90% 96%); border-color: hsl(210 60% 55%); color: hsl(210 40% 25%); }
#print-container .note-inner.green { background: hsl(152 60% 96%); border-color: hsl(152 55% 45%); color: hsl(152 40% 20%); }
#print-container .note-inner.yellow { background: hsl(45 100% 96%); border-color: hsl(38 80% 55%); color: hsl(38 50% 25%); }
#print-container .note-inner.orange { background: hsl(30 90% 96%); border-color: hsl(25 80% 55%); color: hsl(25 50% 25%); }
#print-container .note-inner.pink { background: hsl(340 80% 97%); border-color: hsl(340 55% 55%); color: hsl(340 40% 25%); }
#print-container .note-inner.purple { background: hsl(280 70% 97%); border-color: hsl(280 50% 55%); color: hsl(280 35% 25%); }
#print-container .note-priority.high { background: hsl(0 70% 92%); color: hsl(0 70% 40%); }
#print-container .note-priority.medium { background: hsl(38 70% 92%); color: hsl(38 60% 35%); }
#print-container .note-priority.low { background: hsl(152 50% 92%); color: hsl(152 40% 30%); }

/* Print / PDF */
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4 portrait; margin: 0; }
  body { overflow: visible; height: auto; background: white; color: #111; }
  .bloo-header, .canvas-wrapper, .search-overlay, .canvas-wrapper::before { display: none !important; }
  #print-container { display: block !important; }

  /* Page base */
  .print-page {
    width: 210mm; height: 297mm;
    padding: 14mm 16mm 18mm 16mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    box-sizing: border-box;
  }
  .print-page:last-child { page-break-after: avoid; }

  /* Cover page */
  .print-cover {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; height: 100%;
    position: relative;
  }
  .print-cover-title {
    font-size: 42px; font-weight: 800;
    color: hsl(155 65% 30%);
    margin-bottom: 6px;
    font-family: 'Almarai', 'Inter', sans-serif;
  }
  .print-cover-subtitle {
    font-size: 16px; font-weight: 400; color: #666;
    margin-bottom: 24px;
    font-family: 'Almarai', 'Inter', sans-serif;
  }
  .print-cover-desc {
    font-size: 12px; color: #777; max-width: 140mm;
    line-height: 1.7; margin-bottom: 32px;
    text-align: justify;
  }
  .print-cover-date { font-size: 13px; color: #888; }
  .print-cover-brand {
    position: absolute; bottom: 0; left: 0; right: 0;
    text-align: center;
    font-size: 8px; color: #ccc;
    letter-spacing: 1px; text-transform: lowercase;
  }

  /* Element page header */
  .print-header {
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 6px; margin-bottom: 10px;
    border-bottom: 0.5px solid #ddd;
    font-size: 9px; color: #999;
    font-family: 'Almarai', 'Inter', sans-serif;
  }

  /* Element page content */
  .print-content {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 0;
  }
  .print-el-title { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 4px; text-align: center; }
  .print-el-type { font-size: 10px; color: hsl(155 65% 30%); margin-bottom: 16px; text-align: center; font-family: 'JetBrains Mono', monospace; }
  .print-el-body { max-width: 178mm; max-height: 230mm; overflow: hidden; }
  .print-el-body svg { max-width: 178mm; max-height: 220mm; width: auto; height: auto; display: block; margin: 0 auto; }
  .print-el-body .note-inner { max-width: 178mm; }

  /* Element page footer */
  .print-footer {
    position: absolute; bottom: 10mm; left: 16mm; right: 16mm;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 9px; color: #aaa;
    border-top: 0.5px solid #eee; padding-top: 4px;
    font-family: 'Almarai', 'Inter', sans-serif;
  }

  /* Force light colors on all SVGs in print — comprehensive overrides */
  /* Backgrounds */
  .print-el-body svg [fill="hsl(160 10% 10%)"] { fill: white; }
  .print-el-body svg [fill="hsl(160 10% 10% / 0.8)"] { fill: white; }
  .print-el-body svg [fill="hsl(160 10% 10% / 0.4)"] { fill: hsl(0 0% 96% / 0.4); }
  .print-el-body svg [fill="hsl(160 8% 13%)"] { fill: #f4f4f4; }
  .print-el-body svg [fill="hsl(160 15% 7%)"] { fill: #fafafa; }
  .print-el-body svg [fill="hsl(160 8% 11%)"] { fill: #f5f5f5; }
  /* Text */
  .print-el-body svg [fill="hsl(0 0% 95%)"] { fill: #111; }
  .print-el-body svg [fill="hsl(155 5% 55%)"] { fill: #555; }
  .print-el-body svg [fill="hsl(155 5% 35%)"] { fill: #777; }
  .print-el-body svg [fill="hsl(155 5% 40%)"] { fill: #666; }
  /* Borders */
  .print-el-body svg [stroke="hsl(160 8% 18%)"] { stroke: #ddd; }
  .print-el-body svg [stroke="hsl(155 5% 35%)"] { stroke: #999; }
  .print-el-body svg [stroke="hsl(155 5% 55%)"] { stroke: #666; }
  .print-el-body svg [stroke="hsl(155 5% 30%)"] { stroke: #bbb; }
  .print-el-body svg [stroke="hsl(0 0% 95%)"] { stroke: #333; }
  /* Component fills (15% lightness → 92%) */
  .print-el-body svg [fill="hsl(200 50% 15%)"] { fill: hsl(200 40% 92%); }
  .print-el-body svg [fill="hsl(200 40% 15%)"] { fill: hsl(200 35% 92%); }
  .print-el-body svg [fill="hsl(152 40% 15%)"] { fill: hsl(152 35% 92%); }
  .print-el-body svg [fill="hsl(35 50% 15%)"] { fill: hsl(35 40% 92%); }
  .print-el-body svg [fill="hsl(35 45% 15%)"] { fill: hsl(35 40% 92%); }
  .print-el-body svg [fill="hsl(0 40% 15%)"] { fill: hsl(0 35% 94%); }
  .print-el-body svg [fill="hsl(280 30% 15%)"] { fill: hsl(280 25% 93%); }
  .print-el-body svg [fill="hsl(280 35% 15%)"] { fill: hsl(280 30% 92%); }
  .print-el-body svg [fill="hsl(155 5% 15%)"] { fill: hsl(155 5% 93%); }
  .print-el-body svg [fill="hsl(180 30% 15%)"] { fill: hsl(180 25% 92%); }
  .print-el-body svg [fill="hsl(180 35% 15%)"] { fill: hsl(180 30% 92%); }
  .print-el-body svg [fill="hsl(320 30% 15%)"] { fill: hsl(320 25% 93%); }
  .print-el-body svg [fill="hsl(320 35% 15%)"] { fill: hsl(320 30% 92%); }
  .print-el-body svg [fill="hsl(152 35% 15%)"] { fill: hsl(152 30% 92%); }
  .print-el-body svg [fill="hsl(210 40% 15%)"] { fill: hsl(210 35% 90%); }
  .print-el-body svg [fill="hsl(50 45% 15%)"] { fill: hsl(50 45% 90%); }
  .print-el-body svg [fill="hsl(38 50% 15%)"] { fill: hsl(38 45% 93%); }
  /* Security map (12% fills) */
  .print-el-body svg [fill="hsl(0 40% 12%)"] { fill: hsl(0 35% 94%); }
  .print-el-body svg [fill="hsl(20 45% 12%)"] { fill: hsl(20 40% 93%); }
  .print-el-body svg [fill="hsl(38 45% 12%)"] { fill: hsl(38 40% 93%); }
  .print-el-body svg [fill="hsl(65 40% 12%)"] { fill: hsl(65 35% 93%); }
  .print-el-body svg [fill="hsl(100 35% 12%)"] { fill: hsl(100 30% 93%); }
  .print-el-body svg [fill="hsl(130 35% 12%)"] { fill: hsl(130 30% 93%); }
  .print-el-body svg [fill="hsl(152 40% 12%)"] { fill: hsl(152 35% 93%); }
  .print-el-body svg [fill="hsl(200 40% 12%)"] { fill: hsl(200 35% 93%); }
  .print-el-body svg [fill="hsl(200 40% 13%)"] { fill: hsl(200 35% 93%); }
  .print-el-body svg [fill="hsl(210 40% 12%)"] { fill: hsl(210 35% 93%); }
  .print-el-body svg [fill="hsl(155 5% 12%)"] { fill: hsl(155 5% 94%); }
  .print-el-body svg [fill="hsl(155 5% 10%)"] { fill: hsl(155 5% 95%); }
  .print-el-body svg [fill="hsl(152 40% 15% / 0.3)"] { fill: hsl(152 40% 80% / 0.3); }
  /* Node-specific fills */
  .print-el-body svg [fill="hsl(152 40% 18%)"] { fill: hsl(152 35% 92%); }
  .print-el-body svg [fill="hsl(0 60% 20%)"] { fill: hsl(0 50% 92%); }
  .print-el-body svg [fill="hsl(38 50% 20%)"] { fill: hsl(38 45% 92%); }
  .print-el-body svg [fill="hsl(200 50% 18%)"] { fill: hsl(200 40% 88%); }
  /* Note styling in print */
  .print-el-body .note-inner { color: #333; }
  .print-el-body .note-inner.blue { background: hsl(210 90% 96%); border-color: hsl(210 60% 55%); color: hsl(210 40% 25%); }
  .print-el-body .note-inner.green { background: hsl(152 60% 96%); border-color: hsl(152 55% 45%); color: hsl(152 40% 20%); }
  .print-el-body .note-inner.yellow { background: hsl(45 100% 96%); border-color: hsl(38 80% 55%); color: hsl(38 50% 25%); }
  .print-el-body .note-inner.orange { background: hsl(30 90% 96%); border-color: hsl(25 80% 55%); color: hsl(25 50% 25%); }
  .print-el-body .note-inner.pink { background: hsl(340 80% 97%); border-color: hsl(340 55% 55%); color: hsl(340 40% 25%); }
  .print-el-body .note-inner.purple { background: hsl(280 70% 97%); border-color: hsl(280 50% 55%); color: hsl(280 35% 25%); }
}
`;
