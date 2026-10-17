/* =========================================================
   Tina's Zoo Mahjong — animal mahjong solitaire
   Plain ES2017, no build step, no network, no accounts.
   ========================================================= */
(function () {
  'use strict';

  var STORE = { save: 'zoo.save.v1', stats: 'zoo.stats.v1', settings: 'zoo.settings.v1', last: 'zoo.last.v1' };

  /* every board keeps its own saved game, so starting Meadow never throws away Safari */
  function saveKey(levelId) { return STORE.save + '.' + levelId; }

  /* 48 clearly distinguishable animals; every board uses a random subset. */
  var ANIMALS = [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮',
    '🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦉','🦇','🐺','🐗',
    '🐴','🦄','🐝','🦋','🐌','🐞','🐢','🐍','🐙','🦀','🐠','🐬',
    '🐳','🦈','🐘','🦒','🦓','🦔','🦥','🦦','🦜','🦩','🦝','🦨'
  ];

  /* ---------- layout helpers (coordinates are in half-tile units) ---------- */
  function rect(x0, y0, w, h, z) {
    var out = [], r, c;
    for (r = 0; r < h; r++) for (c = 0; c < w; c++) out.push({ x: (x0 + c) * 2, y: (y0 + r) * 2, z: z });
    return out;
  }
  /* turn the ASCII layers above into tile positions */
  function fromGrid(grid) {
    var out = [], z, r, c;
    for (z = 0; z < grid.length; z++)
      for (r = 0; r < grid[z].length; r++)
        for (c = 0; c < grid[z][r].length; c++)
          if (grid[z][r].charAt(c) === '#') out.push({ x: c * 2, y: r * 2, z: z });
    return out;
  }

  function join() {
    var out = [], i;
    for (i = 0; i < arguments.length; i++) out = out.concat(arguments[i]);
    return out;
  }

  var LEVELS = [
    {
      id: 'meadow', name: 'Meadow', emoji: '🐰', tiles: 48,
      blurb: 'A gentle 48-tile warm-up',
      build: function () {
        return join(
          rect(1, 0, 4, 1, 0), rect(0, 1, 6, 6, 0), rect(1, 7, 4, 1, 0),  /* 44 */
          rect(2, 3, 2, 2, 1)                                             /* 4  */
        );
      }
    },
    {
      id: 'butterfly', name: 'Butterfly', emoji: '🦋', tiles: 72,
      blurb: 'Three layers, 72 tiles',
      build: function () {
        return join(
          rect(0, 0, 3, 1, 0), rect(5, 0, 3, 1, 0),                       /* wing tips */
          rect(0, 1, 8, 2, 0),                                            /* upper wings */
          rect(1, 3, 6, 2, 0),                                            /* waist */
          rect(0, 5, 8, 2, 0),                                            /* lower wings */
          rect(0, 7, 3, 1, 0), rect(5, 7, 3, 1, 0),                       /* wing tips  = 56 */
          rect(3, 1, 2, 6, 1),                                            /* body  = 12 */
          rect(3, 3, 2, 2, 2)                                             /* head  = 4  */
        );
      }
    },
    {
      id: 'tortoise', name: 'Tortoise', emoji: '🐢', tiles: 108,
      blurb: 'A deeper shell, 108 tiles',
      build: function () {
        return join(
          rect(1, 0, 6, 1, 0), rect(0, 1, 8, 7, 0), rect(1, 8, 6, 1, 0),  /* 68 */
          rect(1, 1, 6, 5, 1),                                            /* 30 */
          rect(2, 2, 4, 2, 2),                                            /* 8  */
          rect(3, 2, 2, 1, 3)                                             /* 2  */
        );
      }
    },
    {
      id: 'tower', name: 'Zoo Tower', emoji: '🦒', tiles: 144,
      blurb: 'The full 144-tile classic',
      build: function () {
        return join(
          rect(1, 0, 6, 1, 0), rect(0, 1, 8, 9, 0), rect(1, 10, 6, 1, 0), /* 84 */
          rect(1, 2, 6, 6, 1),                                            /* 36 */
          rect(2, 3, 4, 4, 2),                                            /* 16 */
          rect(3, 4, 2, 3, 3),                                            /* 6  */
          rect(3, 5, 2, 1, 4)                                             /* 2  */
        );
      }
    }
    ,
    {
      id: 'safari', name: 'Safari', emoji: '🦁', tiles: 504,
      blurb: 'The giant one · 504 tiles · pinch to zoom',
      big: true,
      pool: function () { return SAFARI_POOL; },
      build: function () { return fromGrid(SAFARI_GRID); }
    }
  ];

  /* SAFARI needs 126 distinct faces, so animals are topped up with nature.
     Near-identical pairs are deliberately left out (no 🐕 with 🐶, no 🌟 with ⭐). */
  var SAFARI_POOL = [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔',
    '🐧','🐦','🐤','🦆','🦉','🦇','🐺','🐗','🐴','🦄',
    '🐘','🦒','🦓','🦔','🦥','🦜','🦩','🦝','🐿️','🦨','🦙','🦃','🦢','🦅',
    '🦚','🐊','🐢','🐍','🦏','🐪','🦌','🐐','🦬','🦧','🦘','🐆','🦤','🦭',
    '🐝','🦋','🐌','🐞','🐛','🕷️','🦂',
    '🐙','🦀','🐠','🐬','🐳','🦈','🐡','🐚',
    '🌵','🌲','🌳','🌴','🌱','🍀','🍂','🍁','🌾','🪵','🎍',
    '🌸','🌻','🌹','🏵️','💐','🌷','🍄',
    '🌍','🌙','⭐','✨','⚡','🔥','🌈','☀️','⛅','🌧️','❄️','⛄','💧','🌊','🌋','🏔️','🪨','☄️','🌪️',
    '🥥','🍇','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍐','🍑','🍒','🍓','🥝','🍆',
    '🥕','🌽','🌶️','🥦','🧅','🍠','🥜',
    '🐾','🦴','🪶','🥚','🍯','🪴'
  ];

  /* SAFARI board: a lion head, 504 tiles over five layers (16 x 18 cells) */
  var SAFARI_GRID = [
      ['....#......#....', '..####....####..', '...##########...', '..############..', '.##############.', '################', '################', '################', '################', '################', '################', '.##############.', '.##############.', '..############..', '...##########...', '....########....', '.....######.....', '......####......'],
      ['................', '................', '....#......#....', '....########....', '...##########...', '..############..', '.##############.', '.##############.', '.##############.', '.##############.', '..############..', '..############..', '...##########...', '....########....', '.....######.....', '......####......', '.......##.......', '................'],
      ['................', '................', '................', '................', '.....######.....', '....########....', '...##########...', '..############..', '..############..', '...##########...', '...##########...', '....########....', '.....######.....', '......####......', '.......##.......', '................', '................', '................'],
      ['................', '................', '................', '................', '................', '......####......', '.....######.....', '....########....', '....########....', '....########....', '.....######.....', '......####......', '.......##.......', '................', '................', '................', '................', '................'],
      ['................', '................', '................', '................', '................', '................', '.......##.......', '......####......', '.....######.....', '......####......', '.......##.......', '................', '................', '................', '................', '................', '................', '................']
  ];

  var HEARTS = ['❤️', '💕', '💖'];

  /* how long Chase gives you to find the next pair, per board */
  var CHASE_SECONDS = {
    meadow: 8,
    butterfly: 9,
    tortoise: 10,
    tower: 12,
    safari: 15
  };

  /* js/love.js owns the love screen; the stub keeps the game playable if it is missing */
  var Love = window.ZooLove || { show: function () {}, hide: function () {} };

  /* ---------- tiny utils ---------- */
  function $(s) { return document.querySelector(s); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) {
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = rnd(i + 1); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function store(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }
  function drop(key) { try { localStorage.removeItem(key); } catch (e) {} }

  /* set just before an update reload, so the board comes straight back */
  function flagResume() { try { sessionStorage.setItem('zoo.resume', '1'); } catch (e) {} }
  function takeResumeFlag() {
    try {
      var v = sessionStorage.getItem('zoo.resume');
      sessionStorage.removeItem('zoo.resume');
      return v === '1';
    } catch (e) { return false; }
  }

  /* ---------- board model ---------- */
  function buildTiles(level) {
    var pos = level.build();
    var tiles = pos.map(function (p, i) {
      return { i: i, x: p.x, y: p.y, z: p.z, face: null, removed: false, el: null, up: [], left: [], right: [] };
    });
    var a, b, k, n;
    for (k = 0; k < tiles.length; k++) {
      a = tiles[k];
      for (n = 0; n < tiles.length; n++) {
        if (n === k) continue;
        b = tiles[n];
        if (b.z === a.z + 1 && Math.abs(b.x - a.x) < 2 && Math.abs(b.y - a.y) < 2) a.up.push(b);
        else if (b.z === a.z && Math.abs(b.y - a.y) < 2) {
          if (b.x === a.x - 2) a.left.push(b);
          else if (b.x === a.x + 2) a.right.push(b);
        }
      }
    }
    return tiles;
  }

  function gone(t) { return t.removed; }
  function isFree(t) {
    if (t.removed) return false;
    if (!t.up.every(gone)) return false;
    return t.left.every(gone) || t.right.every(gone);
  }

  /* Build a removal order over the tiles that are still on the board.
     Playing the returned pairs in order is always possible, so any board
     dealt from it has at least one full solution. Each pair is chosen so
     that the position left behind still offers two free tiles, which keeps
     the planner from stranding a lone stack it can never take apart. */
  function planPairs(tiles) {
    var snap = tiles.map(function (t) { return t.removed; });
    function restore() { tiles.forEach(function (t, i) { t.removed = snap[i]; }); }
    function alive(pool) { return pool.filter(function (t) { return !t.removed; }); }

    var attempt, pool, pairs, ok, free, rest, tryN, i, j, a, b, chosen;

    for (attempt = 0; attempt < 60; attempt++) {
      restore();
      pool = alive(tiles);
      pairs = []; ok = true;

      while (pool.length) {
        free = pool.filter(isFree);
        if (free.length < 2) { ok = false; break; }

        chosen = null;
        for (tryN = 0; tryN < 40 && !chosen; tryN++) {
          i = rnd(free.length);
          j = rnd(free.length - 1); if (j >= i) j++;
          a = free[i]; b = free[j];
          a.removed = true; b.removed = true;
          rest = alive(pool);
          if (!rest.length || rest.filter(isFree).length >= 2) chosen = [a, b];
          else { a.removed = false; b.removed = false; }
        }
        if (!chosen) {                       /* no safe pair: take one anyway */
          i = rnd(free.length);
          j = rnd(free.length - 1); if (j >= i) j++;
          a = free[i]; b = free[j];
          a.removed = true; b.removed = true;
          chosen = [a, b];
        }

        pairs.push(chosen);
        pool = alive(pool);
      }

      restore();
      if (ok) return pairs;
    }
    restore();
    return null;
  }

  function facesForPairs(n, pool) {
    var src = (pool && pool.length) ? pool : ANIMALS;
    var chosen = shuffle(src.slice()).slice(0, Math.ceil(n / 2));
    var faces = [], i;
    for (i = 0; i < n; i++) faces.push(chosen[Math.floor(i / 2) % chosen.length]);
    return shuffle(faces);
  }

  /* drop any emoji this phone cannot draw, so no two tiles end up as the same box */
  function filterSupported(list, needed) {
    try {
      var ctx = document.createElement('canvas').getContext('2d');
      if (!ctx || !ctx.measureText) return list;
      ctx.font = '32px sans-serif';
      var tofu = ctx.measureText('\uFFFF').width;
      var out = list.filter(function (e) {
        var w = ctx.measureText(e).width;
        return w > 0 && Math.abs(w - tofu) > 0.5;
      });
      return out.length >= needed ? out : list;
    } catch (e) { return list; }
  }

  function applyFaces(pairs, faces) {
    pairs.forEach(function (p, i) { p[0].face = faces[i]; p[1].face = faces[i]; });
  }

  /* ---------- state ---------- */
  var state = null;
  var saved_settings = load(STORE.settings, {});
  var settings = {
    sound: saved_settings.sound !== false,
    dim: saved_settings.dim !== false,
    idleHint: saved_settings.idleHint !== false,
    bigTiles: !!saved_settings.bigTiles,
    mode: saved_settings.mode === 'chase' ? 'chase' : 'classic'
  };
  var stats = load(STORE.stats, {});
  var timer = null;
  var hintTimeout = null;
  var idleTimer = null;
  var IDLE_MS = 20000;            /* how long a quiet board waits before it nudges */
  var chaseRaf = null;
  var chaseInterval = null;

  function saveSettings() { store(STORE.settings, settings); }

  /* stats are {board: {classic:{played,wins,best}, chase:{played,wins,best,mostPairs}}};
     older saves held a flat {wins,best} for classic only */
  function statFor(levelId, mode) {
    var s = stats[levelId];
    if (!s) s = stats[levelId] = {};
    if (s.wins != null && !s.classic) {
      s.classic = { played: s.wins || 0, wins: s.wins || 0, best: s.best == null ? null : s.best };
      delete s.wins; delete s.best;
    }
    if (!s.classic) s.classic = { played: 0, wins: 0, best: null };
    if (!s.chase) s.chase = { played: 0, wins: 0, best: null, mostPairs: 0 };
    return s[mode === 'chase' ? 'chase' : 'classic'];
  }

  var board = $('#board');
  var boardWrap = $('#board-wrap');

  /* ---------- sound (synthesised, no asset files) ---------- */
  var Sound = {
    ctx: null,
    unlock: function () {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!this.ctx) this.ctx = new AC();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) {}
    },
    note: function (freq, start, dur, type, vol) {
      if (!settings.sound || !this.ctx) return;
      var c = this.ctx, t0 = c.currentTime + start;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    },
    tap: function () { this.note(600, 0, 0.07, 'triangle', 0.06); },
    match: function () { this.note(740, 0, 0.1, 'sine', 0.1); this.note(1110, 0.07, 0.16, 'sine', 0.07); },
    nope: function () { this.note(190, 0, 0.12, 'square', 0.045); },
    win: function () {
      var seq = [523, 659, 784, 1047, 1319], i;
      for (i = 0; i < seq.length; i++) this.note(seq[i], i * 0.11, 0.3, 'sine', 0.1);
    }
  };

  /* ---------- screens ---------- */
  function show(screen) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('is-active'); });
    $('#screen-' + screen).classList.add('is-active');
  }

  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('is-on'); }, 1700);
  }

  function openSheet(html, onReady) {
    var o = $('#overlay'), s = $('#sheet');
    s.innerHTML = html;
    o.hidden = false;
    if (onReady) onReady(s);
  }
  function closeSheet() { $('#overlay').hidden = true; $('#sheet').innerHTML = ''; }
  function sheetOpen() { return !$('#overlay').hidden; }

  /* ---------- home ---------- */
  function renderHome() {
    var wrap = $('#levels');
    wrap.innerHTML = '';
    LEVELS.forEach(function (lv) {
      var st = statFor(lv.id, settings.mode);
      var b = el('button', 'level');
      var right = '';
      if (settings.mode === 'chase') {
        if (st.best != null) right = '<span class="star">🏆</span>' + fmtTime(st.best);
        else if (st.mostPairs) right = '<span class="star">🐾</span>' + st.mostPairs + ' pairs';
      } else if (st.best != null) {
        right = '<span class="star">⭐️</span>' + fmtTime(st.best);
      }
      var open = loadSave(lv.id);
      var inProgress = open && open.mode === settings.mode
        ? open.removed.filter(function (r) { return !r; }).length : 0;
      b.innerHTML =
        '<span class="level-emoji">' + lv.emoji + '</span>' +
        '<span class="level-body">' +
          '<span class="level-name">' + lv.name + '</span>' +
          '<span class="level-meta">' + (inProgress
            ? '▸ in progress · ' + inProgress + ' tiles left'
            : lv.blurb + (settings.mode === 'chase' ? ' · ' + CHASE_SECONDS[lv.id] + 's per pair' : '')) + '</span>' +
        '</span>' +
        '<span class="level-best">' + right + '</span>';
      b.addEventListener('click', function () {
        var open = loadSave(lv.id);
        if (open && open.mode === settings.mode && restoreGame(open)) return;
        startGame(lv.id, settings.mode);
      });
      wrap.appendChild(b);
    });

    document.querySelectorAll('#mode-pick .mode-btn').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.mode === settings.mode);
    });

    var saved = lastSave();
    var cont = $('#btn-continue');
    if (saved && saved.level && levelById(saved.level)) {
      var lv = levelById(saved.level);
      var left = saved.removed.filter(function (r) { return !r; }).length;
      cont.hidden = false;
      $('#continue-meta').textContent = (lv ? lv.name : '') +
        (saved.mode === 'chase' ? ' · Chase' : '') +
        ' · ' + left + ' tiles left · ' + fmtTime(saved.elapsed);
    } else {
      cont.hidden = true;
    }
  }

  function levelById(id) {
    var i;
    for (i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return null;
  }

  /* ---------- game lifecycle ---------- */
  var poolCache = {};
  function levelPool(level, tileCount) {
    if (!level.pool) return null;
    if (!poolCache[level.id]) poolCache[level.id] = filterSupported(level.pool(), Math.ceil(tileCount / 4));
    return poolCache[level.id];
  }

  function freshState(level, mode, tiles) {
    return {
      level: level.id,
      mode: mode === 'chase' ? 'chase' : 'classic',
      big: !!level.big,
      tiles: tiles,
      layers: tiles.reduce(function (m, t) { return Math.max(m, t.z + 1); }, 1),
      cols: tiles.reduce(function (m, t) { return Math.max(m, t.x / 2 + 1); }, 1),
      rows: tiles.reduce(function (m, t) { return Math.max(m, t.y / 2 + 1); }, 1),
      selected: null,
      history: [],
      moves: 0,
      hints: 0,
      shuffles: 0,
      moveCount: 0,
      elapsed: 0,
      since: Date.now(),
      running: true,
      won: false,
      lost: false,
      chase: null
    };
  }

  function startChase() {
    if (!state || state.mode !== 'chase') return;
    var total = (CHASE_SECONDS[state.level] || 10) * 1000;
    state.chase = { total: total, left: total, last: Date.now() };
    $('#chase-bar').hidden = false;
    paintChase();
    stopChaseClock();
    chaseRaf = requestAnimationFrame(chaseTick);
    /* the interval is the clock that counts; the frame loop only keeps the bar smooth */
    chaseInterval = setInterval(chaseStep, 250);
  }

  function stopChaseClock() {
    cancelAnimationFrame(chaseRaf);
    clearInterval(chaseInterval);
    chaseInterval = null;
  }

  function chaseRunning() {
    return state && state.mode === 'chase' && state.chase && !state.won && !state.lost &&
      state.running && !sheetOpen() && !document.hidden && state.moveCount > 0;
  }

  /* safe to call as often as you like: time is always measured from the last call */
  function chaseStep() {
    if (!state || state.mode !== 'chase' || !state.chase || state.won || state.lost) return;
    var now = Date.now();
    var dt = now - state.chase.last;
    state.chase.last = now;
    if (chaseRunning()) state.chase.left -= dt;
    paintChase();
    if (state.chase.left <= 0) loseChase();
  }

  function chaseTick() {
    chaseStep();
    if (state && state.chase && !state.won && !state.lost) chaseRaf = requestAnimationFrame(chaseTick);
  }

  function paintChase() {
    if (!state || !state.chase) return;
    var pct = Math.max(0, Math.min(1, state.chase.left / state.chase.total));
    var fill = $('#chase-fill');
    fill.style.transform = 'scaleX(' + pct.toFixed(4) + ')';
    fill.classList.toggle('is-danger', state.chase.left <= 3000);
    $('#chase-bar').classList.toggle('is-paused', !chaseRunning() && !state.won && !state.lost);
  }

  function resetChaseClock() {
    if (!state || !state.chase) return;
    state.chase.left = state.chase.total;
    state.chase.last = Date.now();
    paintChase();
  }

  function startGame(levelId, mode) {
    var level = levelById(levelId);
    if (!level) return;
    Love.hide();
    closeSheet();
    var tiles = buildTiles(level);
    var pairs = planPairs(tiles);
    if (!pairs) { toast('Could not deal that board, try again'); return; }
    applyFaces(pairs, facesForPairs(pairs.length, levelPool(level, tiles.length)));

    state = freshState(level, mode || settings.mode, tiles);
    var st = statFor(level.id, state.mode);
    st.played = (st.played || 0) + 1;
    store(STORE.stats, stats);

    show('game');
    $('#chase-bar').hidden = state.mode !== 'chase';   /* before the board is measured */
    renderBoard(true);
    startTimer();
    if (state.mode === 'chase') startChase();
    resetIdle();
    saveGame();
  }

  function restoreGame(saved) {
    var level = levelById(saved.level);
    if (!level) return false;
    var tiles = buildTiles(level);
    if (tiles.length !== saved.faces.length) return false;
    tiles.forEach(function (t, i) { t.face = saved.faces[i]; t.removed = !!saved.removed[i]; });

    Love.hide();
    closeSheet();
    state = freshState(level, saved.mode, tiles);
    state.history = saved.history || [];
    state.moves = saved.moves || 0;
    state.hints = saved.hints || 0;
    state.shuffles = saved.shuffles || 0;
    state.elapsed = saved.elapsed || 0;

    show('game');
    $('#chase-bar').hidden = state.mode !== 'chase';
    renderBoard(false);
    startTimer();
    if (state.mode === 'chase') {
      startChase();
      if (saved.chaseLeft != null) {       /* pick the clock up where it was, never under 3s */
        state.chase.left = Math.max(3000, Math.min(state.chase.total, saved.chaseLeft));
        paintChase();
      }
    }
    resetIdle();
    return true;
  }

  function loadSave(levelId) { return load(saveKey(levelId), null); }
  function dropSave(levelId) {
    drop(saveKey(levelId));
    if (load(STORE.last, null) === levelId) drop(STORE.last);
  }
  function lastSave() {
    var id = load(STORE.last, null);
    var saved = id ? loadSave(id) : null;
    return saved && saved.removed && saved.removed.length ? saved : null;
  }

  /* older builds kept a single save under zoo.save.v1 */
  function migrateSave() {
    var old = load(STORE.save, null);
    if (old && old.level && old.faces) {
      if (!loadSave(old.level)) store(saveKey(old.level), old);
      store(STORE.last, old.level);
    }
    drop(STORE.save);
  }

  function saveGame() {
    if (!state || state.won || state.lost) return;
    store(STORE.last, state.level);
    store(saveKey(state.level), {
      v: 2,
      level: state.level,
      mode: state.mode,
      faces: state.tiles.map(function (t) { return t.face; }),
      removed: state.tiles.map(function (t) { return t.removed ? 1 : 0; }),
      history: state.history,
      moves: state.moves,
      hints: state.hints,
      shuffles: state.shuffles,
      chaseLeft: state.chase ? Math.round(state.chase.left) : null,
      elapsed: elapsedNow()
    });
  }

  function elapsedNow() {
    if (!state) return 0;
    return state.elapsed + (state.running ? (Date.now() - state.since) / 1000 : 0);
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(function () {
      if (state && state.running) $('#stat-time').textContent = fmtTime(elapsedNow());
    }, 500);
  }

  function pauseClock() {
    if (!state || !state.running) return;
    state.elapsed = elapsedNow();
    state.running = false;
  }
  function resumeClock() {
    if (!state || state.running || state.won) return;
    state.since = Date.now();
    state.running = true;
  }

  /* ---------- rendering ---------- */
  var OX = 0.13, OY = 0.15, AR = 1.33;

  function renderBoard(animate) {
    board.innerHTML = '';
    board.classList.toggle('board--big', !!state.big);
    var frag = document.createDocumentFragment();
    state.tiles.forEach(function (t) {
      var n = el('div', 'tile', '<span>' + t.face + '</span>');
      n.style.setProperty('--x', t.x);
      n.style.setProperty('--y', t.y);
      n.style.setProperty('--lz', state.layers - 1 - t.z);
      n.style.setProperty('--z', t.z);
      n.style.zIndex = t.z * 1000 + t.y * 10 + t.x;
      n.dataset.i = t.i;
      if (animate && !state.big) {
        n.classList.add('is-dealing');
        n.style.animationDelay = Math.min(0.5, t.z * 0.04 + (t.y / 2) * 0.012) + 's';
      }
      if (t.removed) n.style.visibility = 'hidden';
      t.el = n;
      frag.appendChild(n);
    });
    board.appendChild(frag);
    fitBoard(true);
    refresh();
  }

  /* tile geometry inside the board, in board pixels */
  function tileBox(t) {
    var tw = state.tw, th = tw * AR, lz = state.layers - 1 - t.z;
    return { x: t.x * (tw / 2) + lz * tw * OX, y: t.y * (th / 2) + lz * tw * OY, w: tw, h: th };
  }

  function fitBoard(reset) {
    if (!state) return;
    var r = boardWrap.getBoundingClientRect();
    var L = state.layers - 1;
    var tw;

    if (state.big) {
      tw = 46;                       /* fixed natural size; the zoom transform does the fitting */
    } else {
      var wNeed = state.cols + L * OX + 0.14;
      var hNeed = state.rows * AR + L * OY + 0.2;
      tw = Math.min(r.width / wNeed, r.height / hNeed);
      tw = Math.max(26, Math.min(tw, settings.bigTiles ? 120 : 96));
    }

    state.tw = tw;
    var th = tw * AR;
    board.style.setProperty('--tw', tw + 'px');
    board.style.setProperty('--th', th + 'px');
    board.style.setProperty('--ox', tw * OX + 'px');
    board.style.setProperty('--oy', tw * OY + 'px');
    var w = state.cols * tw + L * tw * OX;
    var h = state.rows * th + L * tw * OY;
    board.style.width = w + 'px';
    board.style.height = h + 'px';

    var fitScale = state.big ? Math.min((r.width - 6) / w, (r.height - 6) / h) : 1;
    ZooZoom.setContent(w, h, fitScale, !!state.big);
    if (reset) ZooZoom.reset(false);
  }

  /* how many pairs she could take right now (four free copies of a face = two pairs) */
  function countMoves() {
    var counts = {}, n = 0, k;
    state.tiles.forEach(function (t) { if (isFree(t)) counts[t.face] = (counts[t.face] || 0) + 1; });
    for (k in counts) n += Math.floor(counts[k] / 2);
    return n;
  }

  function refresh() {
    var left = 0;
    state.tiles.forEach(function (t) {
      if (t.removed) return;
      left++;
      var free = isFree(t);
      t.el.classList.toggle('is-blocked', !free);
      t.el.classList.toggle('is-free', free);
    });
    state.moveCount = countMoves();
    $('#stat-left').textContent = left;
    $('#stat-moves').textContent = state.moves;
    $('#stat-pairs').textContent = state.moveCount;
    $('#stat-time').textContent = fmtTime(elapsedNow());
    $('#btn-undo').disabled = state.mode === 'chase' || state.history.length === 0;
    return left;
  }

  /* ---------- play ---------- */
  function select(t) {
    if (state.selected) state.selected.el.classList.remove('is-selected');
    state.selected = t;
    if (t) t.el.classList.add('is-selected');
  }

  function wrongWiggle(t) {
    t.el.classList.remove('is-wrong');
    void t.el.offsetWidth;
    t.el.classList.add('is-wrong');
    setTimeout(function () { t.el.classList.remove('is-wrong'); }, 400);
  }

  /* a nudge after a long pause, classic mode only */
  function resetIdle() {
    clearTimeout(idleTimer);
    if (!state || state.won || state.lost || state.mode === 'chase' || !settings.idleHint) return;
    idleTimer = setTimeout(function () {
      if (!state || state.won || state.lost || sheetOpen() || document.hidden) { resetIdle(); return; }
      var hits = findMatch(true);
      if (hits.length) {
        clearIdle();
        var m = hits[rnd(hits.length)];
        m.forEach(function (t) { t.el.classList.add('is-idle'); });
        setTimeout(function () { m.forEach(function (t) { t.el.classList.remove('is-idle'); }); }, 2800);
      }
      resetIdle();
    }, IDLE_MS);
  }

  function clearIdle() {
    clearTimeout(idleTimer);
    if (state) state.tiles.forEach(function (t) { if (t.el) t.el.classList.remove('is-idle'); });
  }

  function tapTile(t) {
    if (!state || state.won || state.lost || sheetOpen()) return;
    Sound.unlock();
    clearHint();
    clearIdle();
    resetIdle();

    if (t.removed) return;
    if (!isFree(t)) { wrongWiggle(t); Sound.nope(); toast('That tile is covered'); return; }

    if (state.selected === t) { select(null); return; }
    if (!state.selected) { select(t); Sound.tap(); return; }

    if (state.selected.face === t.face) {
      var a = state.selected, b = t;
      select(null);
      removePair(a, b);
    } else {
      wrongWiggle(t);
      wrongWiggle(state.selected);
      Sound.nope();
      select(t);
    }
  }

  function removePair(a, b) {
    a.removed = true; b.removed = true;
    state.moves++;
    state.history.push([a.i, b.i]);
    [a, b].forEach(function (t) {
      t.el.classList.remove('is-selected', 'is-hint', 'is-idle');
      t.el.classList.add('is-gone');
      setTimeout(function () {
        if (t.removed) { t.el.style.visibility = 'hidden'; t.el.classList.remove('is-gone'); }
      }, 300);
    });
    Sound.match();
    var left = refresh();
    if (state.mode === 'chase') resetChaseClock();
    saveGame();

    if (left === 0) { win(); return; }
    setTimeout(function () {
      if (!state || state.won || state.lost) return;
      if (findMatch()) return;
      if (state.mode === 'chase') {
        paintChase();                       /* the clock is already paused: no moves */
        if (doShuffle(true)) { toast('No moves — shuffled for free'); resetChaseClock(); }
        else offerShuffle();
      } else {
        offerShuffle();
      }
    }, 420);
  }

  function undo() {
    if (!state || !state.history.length || state.won || state.lost) return;
    if (state.mode === 'chase') { toast('No undo in Chase'); return; }
    var pair = state.history.pop();
    [pair[0], pair[1]].forEach(function (i) {
      var t = state.tiles[i];
      t.removed = false;
      t.el.classList.remove('is-gone');
      t.el.style.visibility = '';
    });
    state.moves = Math.max(0, state.moves - 1);
    select(null);
    refresh();
    saveGame();
    resetIdle();
  }

  function findMatch(all) {
    var free = state.tiles.filter(isFree), hits = [], i, j;
    for (i = 0; i < free.length; i++)
      for (j = i + 1; j < free.length; j++)
        if (free[i].face === free[j].face) {
          if (!all) return [free[i], free[j]];
          hits.push([free[i], free[j]]);
        }
    return all ? hits : null;
  }

  function clearHint() {
    clearTimeout(hintTimeout);
    if (state) state.tiles.forEach(function (t) { if (t.el) t.el.classList.remove('is-hint'); });
  }

  /* bring a pair into view on the big board */
  function focusPair(m) {
    if (!state || !state.big || !ZooZoom.enabled()) return;
    var a = tileBox(m[0]), b = tileBox(m[1]);
    var x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    ZooZoom.focusRect({ x: x, y: y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }, 2);
  }

  function hint() {
    if (!state || state.won || state.lost) return;
    var hits = findMatch(true);
    if (!hits.length) { offerShuffle(); return; }
    var m = hits[rnd(hits.length)];
    clearHint();
    clearIdle();
    state.hints++;
    if (state.mode === 'chase' && state.chase) {
      state.chase.left -= 3000;              /* a hint costs three seconds */
      paintChase();
      toast('Hint · −3s');
    }
    m.forEach(function (t) { t.el.classList.add('is-hint'); });
    focusPair(m);
    hintTimeout = setTimeout(clearHint, 3200);
    saveGame();
    resetIdle();
  }

  function doShuffle(silent) {
    if (!state || state.won || state.lost) return false;
    var remaining = state.tiles.filter(function (t) { return !t.removed; });
    if (remaining.length < 2) return false;
    var pairs = planPairs(state.tiles);
    if (!pairs) return false;

    var counts = {}, facePairs = [], f, k;
    remaining.forEach(function (t) { counts[t.face] = (counts[t.face] || 0) + 1; });
    for (f in counts) for (k = 0; k < Math.floor(counts[f] / 2); k++) facePairs.push(f);
    applyFaces(pairs, shuffle(facePairs));

    state.tiles.forEach(function (t) {
      if (!t.removed) t.el.firstChild.textContent = t.face;
    });
    state.history = [];
    state.shuffles++;
    select(null);
    clearHint();
    clearIdle();
    refresh();
    saveGame();
    resetIdle();
    if (!silent) toast('Shuffled — and still solvable');
    return true;
  }

  function offerShuffle() {
    pauseClock();
    var rescuable = !!planPairs(state.tiles);
    var canUndo = state.mode !== 'chase' && state.history.length > 0;
    if (!rescuable && !canUndo) {
      dropSave(state.level);                              /* dead board: do not offer it again */
      if (state.mode === 'chase') {
        var cst = statFor(state.level, 'chase');
        cst.mostPairs = Math.max(cst.mostPairs || 0, state.moves);
        store(STORE.stats, stats);
      }
    }
    var actions = '';
    if (rescuable) actions += '<button class="btn btn--primary" data-act="shuffle">Shuffle the rest</button>';
    if (canUndo) actions += '<button class="btn btn--' + (rescuable ? 'ghost' : 'primary') + '" data-act="undo">Take a move back</button>';
    actions += '<button class="btn btn--ghost" data-act="restart">New board</button>';
    actions += '<button class="btn btn--ghost" data-act="menu">Back to menu</button>';

    openSheet(
      '<span class="big-emoji">' + (rescuable ? '🙈' : '🐘') + '</span>' +
      '<h2>No moves left</h2>' +
      '<p>' + (rescuable
        ? 'Every free animal is on its own. A shuffle mixes up what is left and keeps the board solvable.'
        : 'The last animals are stacked on top of each other, so no shuffle can open them up.' +
          (canUndo ? ' Take a move back and clear them in a different order.' : '')) + '</p>' +
      '<div class="actions">' + actions + '</div>',
      function (sh) {
        var btn = sh.querySelector('[data-act="shuffle"]');
        if (btn) btn.onclick = function () { closeSheet(); resumeClock(); doShuffle(true); };
        btn = sh.querySelector('[data-act="undo"]');
        if (btn) btn.onclick = function () { closeSheet(); resumeClock(); undo(); };
        sh.querySelector('[data-act="restart"]').onclick = function () { closeSheet(); startGame(state.level, state.mode); };
        sh.querySelector('[data-act="menu"]').onclick = function () { closeSheet(); resumeClock(); toMenu(); };
      }
    );
  }

  /* ---------- end of game ---------- */
  function stopPlay() {
    pauseClock();
    clearInterval(timer);
    clearHint();
    clearIdle();
    stopChaseClock();
  }

  function win() {
    state.won = true;
    stopPlay();
    dropSave(state.level);
    $('#chase-bar').hidden = true;
    Sound.unlock(); Sound.win();

    var secs = Math.round(state.elapsed);
    var lv = levelById(state.level);
    var mode = state.mode;
    var st = statFor(state.level, mode);
    st.wins = (st.wins || 0) + 1;
    if (st.best == null || secs < st.best) st.best = secs;
    if (mode === 'chase') st.mostPairs = Math.max(st.mostPairs || 0, state.moves);
    store(STORE.stats, stats);

    confetti(HEARTS);
    setTimeout(function () {
      if (!state || !state.won) return;
      Love.show({
        time: fmtTime(secs),
        best: fmtTime(st.best),
        again: function () { startGame(lv.id, mode); },
        menu: function () { toMenu(); }
      });
    }, 380);
  }

  function loseChase() {
    if (!state || state.lost || state.won) return;
    state.lost = true;
    stopPlay();
    dropSave(state.level);
    $('#chase-fill').style.transform = 'scaleX(0)';
    Sound.nope();

    var lv = levelById(state.level);
    var st = statFor(state.level, 'chase');
    st.mostPairs = Math.max(st.mostPairs || 0, state.moves);
    store(STORE.stats, stats);

    var pairs = state.moves;
    var tilesLeft = state.tiles.filter(function (t) { return !t.removed; }).length;
    openSheet(
      '<span class="big-emoji">🐼</span>' +
      '<h2>So close!</h2>' +
      '<p>The clock ran out on ' + lv.name + '. ' +
        (pairs ? 'You cleared ' + pairs + ' pair' + (pairs === 1 ? '' : 's') + ' — ' + tilesLeft + ' tiles still waiting.' : 'Next one is yours.') + '</p>' +
      '<div class="result-grid">' +
        '<div><b>' + pairs + '</b><span>pairs</span></div>' +
        '<div><b>' + (st.mostPairs || pairs) + '</b><span>best pairs</span></div>' +
        '<div><b>' + (st.best != null ? fmtTime(st.best) : '—') + '</b><span>best win</span></div>' +
      '</div>' +
      '<div class="actions">' +
        '<button class="btn btn--primary" data-act="again">Try again</button>' +
        '<button class="btn btn--ghost" data-act="classic">Play it without the clock</button>' +
        '<button class="btn btn--ghost" data-act="menu">Choose board</button>' +
      '</div>',
      function (sh) {
        sh.querySelector('[data-act="again"]').onclick = function () { closeSheet(); startGame(lv.id, 'chase'); };
        sh.querySelector('[data-act="classic"]').onclick = function () { closeSheet(); startGame(lv.id, 'classic'); };
        sh.querySelector('[data-act="menu"]').onclick = function () { closeSheet(); toMenu(); };
      }
    );
  }

  function confetti(palette) {
    var box = $('#confetti'), i, n, pick;
    palette = palette || ANIMALS;
    box.innerHTML = '';
    for (i = 0; i < 26; i++) {
      pick = palette[rnd(palette.length)];
      n = el('i', '', pick);
      n.style.left = rnd(100) + 'vw';
      n.style.fontSize = (18 + rnd(20)) + 'px';
      n.style.setProperty('--spin', (rnd(720) - 360) + 'deg');
      n.style.animationDuration = (2.4 + Math.random() * 2.2) + 's';
      n.style.animationDelay = (Math.random() * 0.9) + 's';
      box.appendChild(n);
    }
    setTimeout(function () { box.innerHTML = ''; }, 5600);
  }

  function toMenu() {
    Love.hide();
    saveGame();
    clearInterval(timer);
    stopChaseClock();
    clearHint();
    clearIdle();
    $('#chase-bar').hidden = true;
    state = null;
    renderHome();
    show('home');
  }

  /* ---------- pause / how to play ---------- */
  function pauseMenu() {
    if (!state || state.won || state.lost) return;
    pauseClock();
    openSheet(
      '<span class="big-emoji">⏸️</span>' +
      '<h2>Paused</h2>' +
      '<p>' + levelById(state.level).name + (state.mode === 'chase' ? ' · Chase' : '') + ' · ' + fmtTime(elapsedNow()) + '</p>' +
      '<div class="actions">' +
        '<button class="btn btn--primary" data-act="resume">Resume</button>' +
        '<button class="btn btn--ghost" data-act="restart">New board</button>' +
        '<button class="btn btn--ghost" data-act="menu">Back to menu</button>' +
      '</div>',
      function (s) {
        s.querySelector('[data-act="resume"]').onclick = function () { closeSheet(); resumeClock(); };
        s.querySelector('[data-act="restart"]').onclick = function () { closeSheet(); startGame(state.level, state.mode); };
        s.querySelector('[data-act="menu"]').onclick = function () { closeSheet(); resumeClock(); toMenu(); };
      }
    );
  }

  /* ---------- settings & stats ---------- */
  function toggleRow(key, label, note) {
    return '<label class="srow"><span class="srow-txt"><b>' + label + '</b>' +
      (note ? '<i>' + note + '</i>' : '') + '</span>' +
      '<input type="checkbox" class="sw" data-set="' + key + '"' + (settings[key] ? ' checked' : '') + '></label>';
  }

  function settingsSheet() {
    openSheet(
      '<span class="big-emoji">⚙️</span>' +
      '<h2>Settings</h2>' +
      '<div class="srows">' +
        toggleRow('sound', 'Sound', 'taps, matches and the winning tune') +
        toggleRow('dim', 'Dim covered tiles', 'free tiles stand out') +
        toggleRow('idleHint', 'Idle nudge', 'pulses a pair after 20 seconds') +
        toggleRow('bigTiles', 'Bigger animals', 'larger emoji on every tile') +
      '</div>' +
      '<div class="actions"><button class="btn btn--primary" data-act="ok">Done</button></div>',
      function (sh) {
        sh.querySelectorAll('.sw').forEach(function (box) {
          box.addEventListener('change', function () {
            settings[box.dataset.set] = box.checked;
            saveSettings();
            applySettings();
          });
        });
        sh.querySelector('[data-act="ok"]').onclick = closeSheet;
      }
    );
  }

  function statsSheet() {
    var rows = LEVELS.map(function (lv) {
      var c = statFor(lv.id, 'classic'), ch = statFor(lv.id, 'chase');
      return '<tr><th>' + lv.emoji + ' ' + lv.name + '</th>' +
        '<td>' + (c.wins || 0) + '/' + (c.played || 0) + '<i>' + (c.best != null ? fmtTime(c.best) : '—') + '</i></td>' +
        '<td>' + (ch.wins || 0) + '/' + (ch.played || 0) + '<i>' +
          (ch.best != null ? fmtTime(ch.best) : (ch.mostPairs ? ch.mostPairs + ' pairs' : '—')) + '</i></td></tr>';
    }).join('');
    var tot = LEVELS.reduce(function (a, lv) {
      var c = statFor(lv.id, 'classic'), ch = statFor(lv.id, 'chase');
      a.played += (c.played || 0) + (ch.played || 0);
      a.wins += (c.wins || 0) + (ch.wins || 0);
      return a;
    }, { played: 0, wins: 0 });

    openSheet(
      '<span class="big-emoji">📊</span>' +
      '<h2>Stats</h2>' +
      '<div class="result-grid">' +
        '<div><b>' + tot.played + '</b><span>played</span></div>' +
        '<div><b>' + tot.wins + '</b><span>won</span></div>' +
      '</div>' +
      '<table class="stats-table"><thead><tr><th></th><th>Classic</th><th>Chase</th></tr></thead><tbody>' +
        rows + '</tbody></table>' +
      '<p class="stats-note">won / played, with the best time underneath</p>' +
      '<div class="actions"><button class="btn btn--primary" data-act="ok">Close</button></div>',
      function (sh) { sh.querySelector('[data-act="ok"]').onclick = closeSheet; }
    );
  }

  function applySettings() {
    document.body.classList.toggle('no-dim', !settings.dim);
    document.body.classList.toggle('big-tiles', !!settings.bigTiles);
    paintSound();
    if (state) { fitBoard(false); if (!settings.idleHint) clearIdle(); resetIdle(); }
  }

  function howTo() {
    openSheet(
      '<span class="big-emoji">🐾</span>' +
      '<h2>How to play</h2>' +
      '<ol class="howto">' +
        '<li><span class="n">1</span><span>Tap two <b>matching animals</b> to send them home.</span></li>' +
        '<li><span class="n">2</span><span>A tile can only be picked when <b>nothing sits on top of it</b> and its <b>left or right side is open</b>. Dimmed tiles are stuck.</span></li>' +
        '<li><span class="n">3</span><span>Clear every tile to win. <b>Hint</b> finds a pair, <b>Shuffle</b> rescues a stuck board, <b>Undo</b> takes a move back.</span></li>' +
        '<li><span class="n">4</span><span>Every board is dealt so that it <b>can always be solved</b>.</span></li>' +
        '<li><span class="n">5</span><span>On <b>Safari</b> (504 tiles) <b>pinch to zoom</b>, drag to move around, and double-tap to zoom in and out. <b>Fit</b> in the corner shows the whole board again.</span></li>' +
        '<li><span class="n">6</span><span><b>Chase</b> gives you a few seconds to find each pair. The clock stops whenever there is no move, and a hint costs 3 seconds.</span></li>' +
      '</ol>' +
      '<div class="actions"><button class="btn btn--primary" data-act="ok">Got it</button></div>',
      function (s) { s.querySelector('[data-act="ok"]').onclick = closeSheet; }
    );
  }

  function installHelp() {
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    openSheet(
      '<span class="big-emoji">📲</span>' +
      '<h2>Add to Home Screen</h2>' +
      (isIOS
        ? '<ol class="howto">' +
            '<li><span class="n">1</span><span>Tap the <b>Share</b> button at the bottom of Safari (the square with an arrow).</span></li>' +
            '<li><span class="n">2</span><span>Scroll down and tap <b>Add to Home Screen</b>.</span></li>' +
            '<li><span class="n">3</span><span>Tap <b>Add</b>. The zoo now opens full screen, and works without internet.</span></li>' +
          '</ol>'
        : '<p>Open this page on your iPhone in Safari, tap the Share button and choose “Add to Home Screen”. It then runs full screen and works offline.</p>') +
      '<div class="actions"><button class="btn btn--primary" data-act="ok">Close</button></div>',
      function (s) { s.querySelector('[data-act="ok"]').onclick = closeSheet; }
    );
  }

  /* ---------- wiring ---------- */

  /* every tap on the board comes through the gesture controller, so a tap is
     never confused with a pan or a pinch */
  ZooZoom.attach({
    viewport: boardWrap,
    content: board,
    onTap: function (x, y) {
      if (!state) return;
      var hit = document.elementFromPoint(x, y);
      var node = hit && hit.closest ? hit.closest('.tile') : null;
      if (!node) return;
      var t = state.tiles[+node.dataset.i];
      if (t) tapTile(t);
    },
    onDoubleTap: function (x, y) {
      if (!state || !state.big) return;
      select(null);                 /* the first of the two taps had selected a tile */
      if (ZooZoom.isZoomed()) ZooZoom.reset(true);
      else ZooZoom.zoomTo(2.6, x, y, true);
    }
  });

  $('#btn-zoom-out').addEventListener('click', function () { ZooZoom.reset(true); });

  $('#btn-back').addEventListener('click', toMenu);
  $('#btn-pause').addEventListener('click', pauseMenu);
  $('#btn-undo').addEventListener('click', function () { Sound.unlock(); undo(); });
  $('#btn-hint').addEventListener('click', function () { Sound.unlock(); hint(); });
  $('#btn-shuffle').addEventListener('click', function () {
    Sound.unlock();
    if (!state || state.won || state.lost) return;
    if (!doShuffle()) offerShuffle();      /* a shuffle you asked for never refills the Chase clock */
  });
  $('#btn-how').addEventListener('click', howTo);
  $('#btn-install').addEventListener('click', installHelp);
  $('#btn-settings').addEventListener('click', settingsSheet);
  $('#btn-stats').addEventListener('click', statsSheet);
  $('#btn-continue').addEventListener('click', function () {
    var saved = lastSave();
    if (!saved || !restoreGame(saved)) { if (saved) dropSave(saved.level); renderHome(); }
  });

  document.querySelectorAll('#mode-pick .mode-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      settings.mode = b.dataset.mode === 'chase' ? 'chase' : 'classic';
      saveSettings();
      renderHome();
    });
  });

  var soundBtn = $('#btn-sound');
  function paintSound() {
    soundBtn.classList.toggle('is-muted', !settings.sound);
    $('#sound-label').textContent = settings.sound ? 'Sound' : 'Muted';
  }
  soundBtn.addEventListener('click', function () {
    settings.sound = !settings.sound;
    saveSettings();
    paintSound();
    if (settings.sound) { Sound.unlock(); Sound.tap(); }
  });

  window.addEventListener('resize', function () { fitBoard(true); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { fitBoard(true); }, 260); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { fitBoard(false); });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pauseClock(); saveGame(); clearIdle();
      if (state && state.chase) paintChase();          /* the countdown holds while away */
    } else if (state && !state.won && !state.lost && !sheetOpen()) {
      resumeClock();
      if (state.chase) { state.chase.last = Date.now(); paintChase(); }
      resetIdle();
    }
  });

  /* stop iOS rubber-banding / double-tap zoom outside the board */
  document.addEventListener('touchmove', function (e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest('.home-scroll, .sheet')) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

  /* test hook: only with ?debug in the URL, never in normal play */
  if (location.search.indexOf('debug') >= 0) {
    window.__zoo = {
      get state() { return state; },
      findMatch: function (all) { return findMatch(all); },
      tap: function (t) { tapTile(t); },
      start: startGame,
      levels: LEVELS,
      love: Love,
      zoom: window.ZooZoom,
      settings: settings,
      stats: function () { return stats; },
      chase: function () { return state && state.chase; },
      starve: function () { if (state && state.chase) { state.chase.left = 120; paintChase(); } },
      tileAt: function (i) { return state && state.tiles[i]; },
      setIdleMs: function (v) { IDLE_MS = v; resetIdle(); },
      forceWin: function () {
        if (!state || state.won) return false;
        state.tiles.forEach(function (t) {
          if (!t.removed) { t.removed = true; t.el.style.visibility = 'hidden'; }
        });
        select(null);
        clearHint();
        refresh();
        win();
        return true;
      }
    };
    var dev = el('button', 'dev-win', 'win');
    dev.addEventListener('click', function () { window.__zoo.forceWin(); });
    document.getElementById('app').appendChild(dev);
  }

  /* ---------- boot ---------- */
  migrateSave();
  applySettings();
  renderHome();
  show('home');

  /* came back from an update reload: drop straight back into the board */
  if (takeResumeFlag()) {
    var resumeSave = lastSave();
    if (resumeSave) restoreGame(resumeSave);
  }

  /* ---------- keep the installed app up to date by itself ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && location.search.indexOf('nosw') < 0) {
    window.addEventListener('load', function () {
      var hadController = !!navigator.serviceWorker.controller;
      var lastCheck = Date.now();

      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        /* a worker that installed while the app was closed: let it take over now */
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

        reg.addEventListener('updatefound', function () {
          var fresh = reg.installing;
          if (!fresh) return;
          fresh.addEventListener('statechange', function () {
            if (fresh.state === 'installed' && navigator.serviceWorker.controller) {
              fresh.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        /* look for a new version whenever the app comes back to the foreground */
        document.addEventListener('visibilitychange', function () {
          if (document.hidden || Date.now() - lastCheck < 5 * 60 * 1000) return;
          lastCheck = Date.now();
          reg.update().catch(function () {});
        });
      }).catch(function () {});

      /* the new worker is in charge: save the game, then refresh once */
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadController || window.__reloading) return;
        window.__reloading = true;
        if (state && !state.won && !state.lost) {   /* a board was open: bring it back */
          saveGame();
          if (lastSave()) flagResume();
        }
        location.reload();
      });
    });
  }
})();
