export const BOARD_JS = `
(function() {
  'use strict';
  var boardData = JSON.parse(document.getElementById('board-data').textContent);
  var canvas = document.getElementById('canvas');
  var wrapper = document.getElementById('canvas-wrapper');
  var cards = document.querySelectorAll('.bloo-card');
  var scale = 1;

  // --- Theme ---
  var theme = localStorage.getItem('bloo-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  window.toggleTheme = function() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bloo-theme', theme);
  };

  // --- Zoom ---
  function centerCanvas() {
    // If scaled canvas is smaller than viewport, center with translate
    var vw = wrapper.clientWidth;
    var vh = wrapper.clientHeight;
    var scaledW = canvas.scrollWidth * scale;
    var scaledH = canvas.scrollHeight * scale;
    var padX = scaledW < vw ? (vw - scaledW) / 2 / scale : 0;
    var padY = scaledH < vh ? (vh - scaledH) / 2 / scale : 0;
    if (padX > 0 || padY > 0) {
      canvas.style.transform = 'scale(' + scale + ') translate(' + padX + 'px,' + padY + 'px)';
    } else {
      canvas.style.transform = 'scale(' + scale + ')';
    }
    canvas.style.transformOrigin = '0 0';
    document.getElementById('zoom-display').textContent = Math.round(scale * 100) + '%';
  }

  function zoomTo(newScale) {
    var vw = wrapper.clientWidth;
    var vh = wrapper.clientHeight;
    // Get current center point in canvas coordinates
    var oldPadX = canvas.scrollWidth * scale < vw ? (vw - canvas.scrollWidth * scale) / 2 : 0;
    var oldPadY = canvas.scrollHeight * scale < vh ? (vh - canvas.scrollHeight * scale) / 2 : 0;
    var centerX = (wrapper.scrollLeft + vw / 2 - oldPadX) / scale;
    var centerY = (wrapper.scrollTop + vh / 2 - oldPadY) / scale;
    scale = newScale;
    centerCanvas();
    // Scroll to keep the same center point
    var newPadX = canvas.scrollWidth * scale < vw ? (vw - canvas.scrollWidth * scale) / 2 : 0;
    var newPadY = canvas.scrollHeight * scale < vh ? (vh - canvas.scrollHeight * scale) / 2 : 0;
    wrapper.scrollLeft = centerX * scale + newPadX - vw / 2;
    wrapper.scrollTop = centerY * scale + newPadY - vh / 2;
  }
  window.zoomIn = function() { zoomTo(Math.min(scale * 1.2, 3)); };
  window.zoomOut = function() { zoomTo(Math.max(scale / 1.2, 0.2)); };

  // Mouse wheel zoom — zooms toward cursor position
  wrapper.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      zoomTo(Math.max(0.2, Math.min(3, scale * delta)));
    }
  }, { passive: false });

  // Fit all — zoom to fit content and center it
  window.fitAll = function() {
    var minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    cards.forEach(function(c) {
      var l = c.offsetLeft;
      var t = c.offsetTop;
      var r = l + c.offsetWidth;
      var b = t + c.offsetHeight;
      if (l < minX) minX = l;
      if (t < minY) minY = t;
      if (r > maxX) maxX = r;
      if (b > maxY) maxY = b;
    });
    if (maxX === 0 || maxY === 0) return;
    var contentW = maxX - minX;
    var contentH = maxY - minY;
    var contentCX = (minX + maxX) / 2;
    var contentCY = (minY + maxY) / 2;
    var vw = wrapper.clientWidth;
    var vh = wrapper.clientHeight;
    scale = Math.min((vw - 40) / contentW, (vh - 40) / contentH, 1);
    centerCanvas();
    // Scroll to center the content
    var padX = canvas.scrollWidth * scale < vw ? (vw - canvas.scrollWidth * scale) / 2 : 0;
    var padY = canvas.scrollHeight * scale < vh ? (vh - canvas.scrollHeight * scale) / 2 : 0;
    wrapper.scrollLeft = contentCX * scale + padX - vw / 2;
    wrapper.scrollTop = contentCY * scale + padY - vh / 2;
  };

  // --- Edit / View mode ---
  var editMode = false;
  var editIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>';
  var saveIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
  window.toggleEditMode = function() {
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    var btn = document.getElementById('btn-edit');
    btn.classList.toggle('edit-active', editMode);
    btn.innerHTML = editMode ? saveIcon : editIcon;
    btn.title = editMode ? 'Exit edit mode' : 'Edit mode';
  };

  // --- Drag cards (edit mode only) ---
  var dragCard = null;
  var dragOffX = 0, dragOffY = 0;

  document.addEventListener('mousedown', function(e) {
    if (!editMode) return;
    var card = e.target.closest('.bloo-card') || e.target.closest('.section-label');
    if (!card) return;
    if (e.target.closest('.resize-handle')) return;
    if (e.target.closest('[data-node-id]')) return;

    e.preventDefault();
    dragCard = card;
    dragCard.classList.add('dragging');
    var rect = card.getBoundingClientRect();
    dragOffX = e.clientX - rect.left;
    dragOffY = e.clientY - rect.top;
  });

  document.addEventListener('mousemove', function(e) {
    if (!dragCard) return;
    e.preventDefault();
    var wrapRect = wrapper.getBoundingClientRect();
    var x = (e.clientX - wrapRect.left + wrapper.scrollLeft) / scale - dragOffX / scale;
    var y = (e.clientY - wrapRect.top + wrapper.scrollTop) / scale - dragOffY / scale;
    dragCard.style.left = Math.max(0, x) + 'px';
    dragCard.style.top = Math.max(0, y) + 'px';
  });

  document.addEventListener('mouseup', function() {
    if (dragCard) {
      dragCard.classList.remove('dragging');
      dragCard = null;
    }
  });

  // --- 8-point resize (edit mode only) ---
  var resizeEl = null;
  var resizeHandle = '';
  var resizeStartW, resizeStartH, resizeStartX, resizeStartY, resizeStartL, resizeStartT;

  document.addEventListener('mousedown', function(e) {
    if (!editMode) return;
    var handle = e.target.closest('.resize-handle');
    if (!handle) return;
    e.preventDefault();
    e.stopPropagation();
    resizeEl = handle.closest('.bloo-card') || handle.closest('.section-label');
    resizeHandle = handle.getAttribute('data-rh') || 'br';
    resizeStartW = resizeEl.offsetWidth;
    resizeStartH = resizeEl.offsetHeight;
    resizeStartL = parseFloat(resizeEl.style.left) || 0;
    resizeStartT = parseFloat(resizeEl.style.top) || 0;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
  }, true);

  document.addEventListener('mousemove', function(e) {
    if (!resizeEl) return;
    e.preventDefault();
    var dx = (e.clientX - resizeStartX) / scale;
    var dy = (e.clientY - resizeStartY) / scale;
    var h = resizeHandle;

    // Width changes
    if (h === 'tr' || h === 'br' || h === 'mr') {
      resizeEl.style.width = Math.max(150, resizeStartW + dx) + 'px';
    } else if (h === 'tl' || h === 'bl' || h === 'ml') {
      var newW = Math.max(150, resizeStartW - dx);
      resizeEl.style.width = newW + 'px';
      resizeEl.style.left = (resizeStartL + resizeStartW - newW) + 'px';
    }

    // Height changes
    if (h === 'bl' || h === 'br' || h === 'bm') {
      resizeEl.style.height = Math.max(80, resizeStartH + dy) + 'px';
    } else if (h === 'tl' || h === 'tr' || h === 'tm') {
      var newH = Math.max(80, resizeStartH - dy);
      resizeEl.style.height = newH + 'px';
      resizeEl.style.top = (resizeStartT + resizeStartH - newH) + 'px';
    }
  });

  document.addEventListener('mouseup', function() {
    resizeEl = null;
  });

  // --- Pan canvas (middle-click or background drag) ---
  var isPanning = false;
  var panStartX, panStartY, panScrollX, panScrollY;

  wrapper.addEventListener('mousedown', function(e) {
    // Only pan if clicking the canvas background (not a card)
    if (e.target.closest('.bloo-card')) return;
    if (e.button !== 0 && e.button !== 1) return;
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panScrollX = wrapper.scrollLeft;
    panScrollY = wrapper.scrollTop;
    wrapper.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isPanning) return;
    wrapper.scrollLeft = panScrollX - (e.clientX - panStartX);
    wrapper.scrollTop = panScrollY - (e.clientY - panStartY);
  });

  document.addEventListener('mouseup', function() {
    isPanning = false;
    wrapper.style.cursor = '';
  });

  // --- Save layout ---
  // --- SVG interactivity (hover/click highlights) ---
  document.querySelectorAll('.card-body svg').forEach(function(svg) {
    var nodes = svg.querySelectorAll('[data-node-id]');
    var conns = svg.querySelectorAll('[data-conn-from]');
    var selected = null;

    nodes.forEach(function(node) {
      node.classList.add('hoverable');
      node.addEventListener('mouseenter', function() {
        if (selected) return;
        highlightNode(svg, node.getAttribute('data-node-id'), nodes, conns);
      });
      node.addEventListener('mouseleave', function() {
        if (selected) return;
        clearHL(nodes, conns);
      });
      node.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = node.getAttribute('data-node-id');
        if (selected === id) { selected = null; clearHL(nodes, conns); }
        else { selected = id; highlightNode(svg, id, nodes, conns); }
      });
    });
    svg.addEventListener('click', function() { selected = null; clearHL(nodes, conns); });
  });

  function highlightNode(svg, nodeId, nodes, conns) {
    nodes.forEach(function(n) { n.classList.add('dimmed'); n.classList.remove('highlighted-node'); });
    conns.forEach(function(c) { c.classList.add('dimmed'); c.classList.remove('highlighted-conn'); });
    var target = svg.querySelector('[data-node-id="' + nodeId + '"]');
    if (target) { target.classList.remove('dimmed'); target.classList.add('highlighted-node'); }
    conns.forEach(function(c) {
      if (c.getAttribute('data-conn-from') === nodeId || c.getAttribute('data-conn-to') === nodeId) {
        c.classList.remove('dimmed'); c.classList.add('highlighted-conn');
        var other = c.getAttribute('data-conn-from') === nodeId ? c.getAttribute('data-conn-to') : c.getAttribute('data-conn-from');
        var otherN = svg.querySelector('[data-node-id="' + other + '"]');
        if (otherN) otherN.classList.remove('dimmed');
      }
    });
  }
  function clearHL(nodes, conns) {
    nodes.forEach(function(n) { n.classList.remove('dimmed', 'highlighted-node'); });
    conns.forEach(function(c) { c.classList.remove('dimmed', 'highlighted-conn'); });
  }

  // --- Search ---
  window.toggleSearch = function() {
    var ov = document.getElementById('search-overlay');
    var vis = ov.style.display !== 'none';
    ov.style.display = vis ? 'none' : 'flex';
    if (!vis) { var inp = document.getElementById('search-input'); inp.value = ''; inp.focus(); document.getElementById('search-results').innerHTML = ''; }
  };
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') document.getElementById('search-overlay').style.display = 'none';
    if (e.key === '/' && e.target.tagName !== 'INPUT') { e.preventDefault(); toggleSearch(); }
  });
  window.doSearch = function(q) {
    var res = document.getElementById('search-results');
    q = q.toLowerCase().trim();
    if (!q) { res.innerHTML = ''; return; }
    var matches = [];
    boardData.sections.forEach(function(s) {
      s.elements.forEach(function(el) {
        if ((el.name + ' ' + el.description + ' ' + JSON.stringify(el.data)).toLowerCase().indexOf(q) !== -1)
          matches.push({ id: el.id, name: el.name, type: el.type, section: s.title });
      });
    });
    res.innerHTML = matches.slice(0, 15).map(function(m) {
      return '<div class="search-result" onclick="scrollToCard(\\'' + m.id + '\\')">' +
        '<span class="sr-name">' + esc(m.name) + '</span><span class="sr-type">' + m.type.replace(/_/g,' ') + '</span>' +
        '<div class="sr-section">' + esc(m.section) + '</div></div>';
    }).join('');
  };
  window.scrollToCard = function(id) {
    document.getElementById('search-overlay').style.display = 'none';
    var card = document.querySelector('[data-card-id="' + id + '"]');
    if (!card) return;
    var x = parseInt(card.style.left) * scale - wrapper.clientWidth / 2 + card.offsetWidth * scale / 2;
    var y = parseInt(card.style.top) * scale - wrapper.clientHeight / 2 + card.offsetHeight * scale / 2;
    wrapper.scrollLeft = x;
    wrapper.scrollTop = y;
    card.style.outline = '2px solid var(--accent)';
    card.style.outlineOffset = '4px';
    setTimeout(function() { card.style.outline = ''; card.style.outlineOffset = ''; }, 2000);
  };

  function esc(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }

  // --- Initial fit (hidden until ready to prevent 100% flash) ---
  requestAnimationFrame(function() {
    fitAll();
    wrapper.classList.add('ready');
  });
})();
`;
