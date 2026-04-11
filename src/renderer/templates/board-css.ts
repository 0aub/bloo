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
.header-right { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; }
.board-title {
  font-size: 16px; font-weight: 800;
  background: linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.board-version { color: var(--fg-muted); font-size: 11px; font-family: var(--mono); }
.board-tags { display: flex; gap: 3px; }
.board-tag {
  font-size: 9px; padding: 1px 6px; border-radius: 9999px;
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--accent); font-family: var(--mono);
}
.zoom-display { color: var(--fg-muted); font-size: 11px; font-family: var(--mono); min-width: 36px; text-align: center; }
.bloo-header button {
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--fg); padding: 4px 10px; border-radius: 5px;
  cursor: pointer; font-size: 11px; font-family: var(--font);
  transition: all 0.15s; white-space: nowrap;
}
.bloo-header button:hover { border-color: var(--accent); color: var(--accent); }

/* Canvas wrapper — handles pan via scroll */
.canvas-wrapper {
  position: fixed;
  top: 44px; left: 0; right: 0; bottom: 0;
  overflow: auto;
  background: var(--bg);
  cursor: grab;
}
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

/* Text block */
.text-block-inner {
  font-size: 12px; line-height: 1.7; color: var(--fg);
  overflow: visible; text-align: justify;
  padding: 4px;
}

/* SVG interactivity */
svg .hoverable { cursor: pointer; transition: opacity 0.15s, filter 0.15s; }
svg .hoverable:hover { filter: brightness(1.2); }
svg .dimmed { opacity: 0.15; transition: opacity 0.3s; }
svg .highlighted-conn { stroke-width: 3 !important; filter: drop-shadow(0 0 6px var(--accent)); }
svg .highlighted-node { filter: drop-shadow(0 0 8px var(--accent)) brightness(1.2); }

/* Resize handle */
.resize-handle {
  position: absolute; bottom: 0; right: 0;
  width: 14px; height: 14px;
  cursor: nwse-resize;
  opacity: 0; transition: opacity 0.15s;
}
.bloo-card:hover .resize-handle { opacity: 0.5; }
.resize-handle::after {
  content: '';
  position: absolute; bottom: 3px; right: 3px;
  width: 8px; height: 8px;
  border-right: 2px solid var(--fg-muted);
  border-bottom: 2px solid var(--fg-muted);
}

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

/* Print / PDF */
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { margin: 0.5cm; size: landscape; }
  body { overflow: visible; height: auto; }
  .bloo-header { position: static; }
  .bloo-header button { display: none; }
  .canvas-wrapper { position: static; overflow: visible; height: auto; }
  .canvas-wrapper::before { display: none; }
  .canvas { transform: none !important; position: static; display: flex; flex-wrap: wrap; gap: 8px; }
  .bloo-card { position: static !important; width: auto !important; height: auto !important; break-inside: avoid; flex: 0 0 45%; }
  .section-label { display: none; }
  .search-overlay { display: none !important; }
  .resize-handle { display: none; }
}
`;
