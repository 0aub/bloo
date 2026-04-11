export const BOARD_SHELL_HTML = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{BOARD_TITLE}} — Bloo</title>
  <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>{{BOARD_CSS}}</style>
</head>
<body>
  <header class="bloo-header">
    <div class="header-left">
      <span class="board-title">{{BOARD_MAIN_TITLE}}</span>
      <span class="board-subtitle">{{BOARD_SUBTITLE}}</span>
      <span class="board-version">v{{BOARD_VERSION}}</span>
    </div>
    <div class="header-right">
      <span class="zoom-display" id="zoom-display">100%</span>
      <div class="toolbar">
        <button class="tool-btn" onclick="zoomOut()" title="Zoom out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="16" y1="16" x2="21" y2="21"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
        <button class="tool-btn" onclick="zoomIn()" title="Zoom in"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="16" y1="16" x2="21" y2="21"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
        <button class="tool-btn" onclick="fitAll()" title="Fit all"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
        <span class="tool-sep"></span>
        <button class="tool-btn" onclick="toggleSearch()" title="Search (/)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="16" y1="16" x2="21" y2="21"/></svg></button>
        <button class="tool-btn" onclick="toggleTheme()" title="Toggle theme"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></button>
        <button class="tool-btn" id="btn-edit" onclick="toggleEditMode()" title="Edit mode"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg></button>
      </div>
    </div>
  </header>

  <div class="canvas-wrapper" id="canvas-wrapper">
    <div class="canvas" id="canvas" style="width:{{CANVAS_W}}px;height:{{CANVAS_H}}px">
      {{CARDS_HTML}}
    </div>
  </div>

  <div id="search-overlay" class="search-overlay" style="display:none">
    <div class="search-box">
      <input id="search-input" type="text" placeholder="Search elements..." oninput="doSearch(this.value)" autocomplete="off"/>
      <button onclick="toggleSearch()">Close</button>
    </div>
    <div id="search-results" class="search-results"></div>
  </div>

  <script id="board-data" type="application/json">{{BOARD_DATA}}</script>
  <script>{{BOARD_INTERACTIVITY_JS}}</script>
</body>
</html>`;
