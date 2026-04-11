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
      <span class="board-title">{{BOARD_TITLE}}</span>
      <span class="board-version">v{{BOARD_VERSION}}</span>
    </div>
    <div class="header-right">
      <div class="board-tags">{{BOARD_TAGS_HTML}}</div>
      <span class="zoom-display" id="zoom-display">100%</span>
      <button onclick="zoomIn()">+</button>
      <button onclick="zoomOut()">&minus;</button>
      <button onclick="fitAll()">Fit</button>
      <button onclick="toggleSearch()">Search</button>
      <button onclick="toggleTheme()">Theme</button>
      <button onclick="saveLayout()">Save Layout</button>
      <button onclick="window.print()">PDF</button>
    </div>
  </header>

  <div class="canvas-wrapper" id="canvas-wrapper">
    <div class="canvas" id="canvas">
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
