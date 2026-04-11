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
  function applyZoom() {
    canvas.style.transform = 'scale(' + scale + ')';
    document.getElementById('zoom-display').textContent = Math.round(scale * 100) + '%';
  }

  window.zoomIn = function() { scale = Math.min(scale * 1.2, 3); applyZoom(); };
  window.zoomOut = function() { scale = Math.max(scale / 1.2, 0.2); applyZoom(); };

  // Mouse wheel zoom
  wrapper.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      scale = Math.max(0.2, Math.min(3, scale * delta));
      applyZoom();
    }
  }, { passive: false });

  // Fit all
  window.fitAll = function() {
    var maxX = 0, maxY = 0;
    cards.forEach(function(c) {
      var r = c.offsetLeft + c.offsetWidth;
      var b = c.offsetTop + c.offsetHeight;
      if (r > maxX) maxX = r;
      if (b > maxY) maxY = b;
    });
    if (maxX === 0 || maxY === 0) return;
    var sw = wrapper.clientWidth - 40;
    var sh = wrapper.clientHeight - 40;
    scale = Math.min(sw / maxX, sh / maxY, 1);
    applyZoom();
    wrapper.scrollLeft = 0;
    wrapper.scrollTop = 0;
  };

  // --- Drag cards ---
  var dragCard = null;
  var dragOffX = 0, dragOffY = 0;

  document.addEventListener('mousedown', function(e) {
    // Drag cards OR section labels
    var card = e.target.closest('.bloo-card') || e.target.closest('.section-label');
    if (!card) return;
    // Don't drag if clicking resize handle
    if (e.target.closest('.resize-handle')) return;
    // Don't drag if clicking inside SVG interactable
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
    // Convert mouse position to canvas coordinates
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

  // --- Resize cards ---
  var resizeCard = null;
  var resizeStartW, resizeStartH, resizeStartX, resizeStartY;

  document.addEventListener('mousedown', function(e) {
    var handle = e.target.closest('.resize-handle');
    if (!handle) return;
    e.preventDefault();
    e.stopPropagation();
    resizeCard = handle.closest('.bloo-card') || handle.closest('.section-label');
    resizeStartW = resizeCard.offsetWidth;
    resizeStartH = resizeCard.offsetHeight;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
  }, true);

  document.addEventListener('mousemove', function(e) {
    if (!resizeCard) return;
    e.preventDefault();
    var dw = (e.clientX - resizeStartX) / scale;
    var dh = (e.clientY - resizeStartY) / scale;
    resizeCard.style.width = Math.max(200, resizeStartW + dw) + 'px';
    resizeCard.style.height = Math.max(100, resizeStartH + dh) + 'px';
  });

  document.addEventListener('mouseup', function() {
    resizeCard = null;
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
  window.saveLayout = function() {
    var layout = { board_id: boardData.id, cards: {}, sections: {} };
    cards.forEach(function(c) {
      var id = c.getAttribute('data-card-id');
      if (id) {
        layout.cards[id] = {
          x: parseInt(c.style.left) || 0,
          y: parseInt(c.style.top) || 0,
          w: c.offsetWidth,
          h: c.offsetHeight
        };
      }
    });
    document.querySelectorAll('.section-label').forEach(function(s, i) {
      layout.sections['sec_' + i] = {
        x: parseInt(s.style.left) || 0,
        y: parseInt(s.style.top) || 0,
        w: s.offsetWidth,
        h: s.offsetHeight
      };
    });
    var blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bloo-layout.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

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

  // --- Initial fit ---
  setTimeout(fitAll, 200);
})();
`;
