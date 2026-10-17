/* =========================================================
   Tina's Zoo Mahjong — animal mahjong solitaire
   Plain ES2017, no build step, no network, no accounts.
   ========================================================= */
(function () {
  'use strict';

  var STORE = { save: 'zoo.save.v1', stats: 'zoo.stats.v1', settings: 'zoo.settings.v1' };

  /* 48 clearly distinguishable animals; every board uses a random subset. */
  var ANIMALS = [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮',
    '🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦉','🦇','🐺','🐗',
    '🐴','🦄','🐝','🦋','🐌','🐞','🐢','🐍','🐙','🦀','🐠','🐬',
    '🐳','🦈','🐘','🦒','🦓','🦔','🦥','🦦','🦜','🦩','🐇','🦝'
  ];

  /* ---------- layout helpers (coordinates are in half-tile units) ---------- */
  function rect(x0, y0, w, h, z) {
    var out = [], r, c;
    for (r = 0; r < h; r++) for (c = 0; c < w; c++) out.push({ x: (x0 + c) * 2, y: (y0 + r) * 2, z: z });
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
  ];

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

  function facesForPairs(n) {
    var chosen = shuffle(ANIMALS.slice()).slice(0, Math.ceil(n / 2));
    var faces = [], i;
    for (i = 0; i < n; i++) faces.push(chosen[Math.floor(i / 2)]);
    return shuffle(faces);
  }

  function applyFaces(pairs, faces) {
    pairs.forEach(function (p, i) { p[0].face = faces[i]; p[1].face = faces[i]; });
  }

  /* ---------- state ---------- */
  var state = null;
  var settings = load(STORE.settings, { sound: true });
  var stats = load(STORE.stats, {});
  var timer = null;
  var hintTimeout = null;

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
      var st = stats[lv.id] || {};
      var b = el('button', 'level');
      b.innerHTML =
        '<span class="level-emoji">' + lv.emoji + '</span>' +
        '<span class="level-body">' +
          '<span class="level-name">' + lv.name + '</span>' +
          '<span class="level-meta">' + lv.blurb + '</span>' +
        '</span>' +
        '<span class="level-best">' +
          (st.best != null ? '<span class="star">⭐️</span>' + fmtTime(st.best) : '') +
        '</span>';
      b.addEventListener('click', function () { startGame(lv.id); });
      wrap.appendChild(b);
    });

    var saved = load(STORE.save, null);
    var cont = $('#btn-continue');
    if (saved && saved.level && saved.removed && saved.removed.length && levelById(saved.level)) {
      var lv = levelById(saved.level);
      var left = saved.removed.filter(function (r) { return !r; }).length;
      cont.hidden = false;
      $('#continue-meta').textContent = (lv ? lv.name : '') + ' · ' + left + ' tiles left · ' + fmtTime(saved.elapsed);
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
  function startGame(levelId) {
    var level = levelById(levelId);
    if (!level) return;
    var tiles = buildTiles(level);
    var pairs = planPairs(tiles);
    if (!pairs) { toast('Could not deal that board, try again'); return; }
    applyFaces(pairs, facesForPairs(pairs.length));

    state = {
      level: levelId,
      tiles: tiles,
      layers: tiles.reduce(function (m, t) { return Math.max(m, t.z + 1); }, 1),
      cols: tiles.reduce(function (m, t) { return Math.max(m, t.x / 2 + 1); }, 1),
      rows: tiles.reduce(function (m, t) { return Math.max(m, t.y / 2 + 1); }, 1),
      selected: null,
      history: [],
      moves: 0,
      hints: 0,
      shuffles: 0,
      elapsed: 0,
      since: Date.now(),
      running: true,
      won: false
    };
    show('game');
    renderBoard(true);
    startTimer();
    saveGame();
  }

  function restoreGame(saved) {
    var level = levelById(saved.level);
    if (!level) return false;
    var tiles = buildTiles(level);
    if (tiles.length !== saved.faces.length) return false;
    tiles.forEach(function (t, i) { t.face = saved.faces[i]; t.removed = !!saved.removed[i]; });
    state = {
      level: saved.level,
      tiles: tiles,
      layers: tiles.reduce(function (m, t) { return Math.max(m, t.z + 1); }, 1),
      cols: tiles.reduce(function (m, t) { return Math.max(m, t.x / 2 + 1); }, 1),
      rows: tiles.reduce(function (m, t) { return Math.max(m, t.y / 2 + 1); }, 1),
      selected: null,
      history: saved.history || [],
      moves: saved.moves || 0,
      hints: saved.hints || 0,
      shuffles: saved.shuffles || 0,
      elapsed: saved.elapsed || 0,
      since: Date.now(),
      running: true,
      won: false
    };
    show('game');
    renderBoard(false);
    startTimer();
    return true;
  }

  function saveGame() {
    if (!state || state.won) return;
    store(STORE.save, {
      v: 1,
      level: state.level,
      faces: state.tiles.map(function (t) { return t.face; }),
      removed: state.tiles.map(function (t) { return t.removed ? 1 : 0; }),
      history: state.history,
      moves: state.moves,
      hints: state.hints,
      shuffles: state.shuffles,
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
  function renderBoard(animate) {
    board.innerHTML = '';
    var frag = document.createDocumentFragment();
    state.tiles.forEach(function (t) {
      var n = el('div', 'tile', '<span>' + t.face + '</span>');
      n.style.setProperty('--x', t.x);
      n.style.setProperty('--y', t.y);
      n.style.setProperty('--lz', state.layers - 1 - t.z);
      n.style.setProperty('--z', t.z);
      n.style.zIndex = t.z * 1000 + t.y * 10 + t.x;
      n.dataset.i = t.i;
      if (animate) n.style.animationDelay = Math.min(0.5, t.z * 0.04 + (t.y / 2) * 0.012) + 's';
      else n.style.animation = 'none';
      if (t.removed) n.style.visibility = 'hidden';
      t.el = n;
      frag.appendChild(n);
    });
    board.appendChild(frag);
    fitBoard();
    refresh();
  }

  function fitBoard() {
    if (!state) return;
    var r = boardWrap.getBoundingClientRect();
    var OX = 0.13, OY = 0.15, AR = 1.33;
    var L = state.layers - 1;
    var wNeed = state.cols + L * OX + 0.14;
    var hNeed = state.rows * AR + L * OY + 0.2;
    var tw = Math.min(r.width / wNeed, r.height / hNeed);
    tw = Math.max(26, Math.min(tw, 96));
    var th = tw * AR;
    board.style.setProperty('--tw', tw + 'px');
    board.style.setProperty('--th', th + 'px');
    board.style.setProperty('--ox', tw * OX + 'px');
    board.style.setProperty('--oy', tw * OY + 'px');
    board.style.width = (state.cols * tw + L * tw * OX) + 'px';
    board.style.height = (state.rows * th + L * tw * OY) + 'px';
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
    $('#stat-left').textContent = left;
    $('#stat-moves').textContent = state.moves;
    $('#stat-time').textContent = fmtTime(elapsedNow());
    $('#btn-undo').disabled = state.history.length === 0;
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

  function tapTile(t) {
    if (!state || state.won || sheetOpen()) return;
    Sound.unlock();
    clearHint();

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
      t.el.classList.remove('is-selected', 'is-hint');
      t.el.classList.add('is-gone');
      setTimeout(function () {
        if (t.removed) { t.el.style.visibility = 'hidden'; t.el.classList.remove('is-gone'); }
      }, 300);
    });
    Sound.match();
    var left = refresh();
    saveGame();

    if (left === 0) { win(); return; }
    setTimeout(function () {
      if (state && !state.won && !findMatch()) offerShuffle();
    }, 420);
  }

  function undo() {
    if (!state || !state.history.length || state.won) return;
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
    state && state.tiles.forEach(function (t) { if (t.el) t.el.classList.remove('is-hint'); });
  }

  function hint() {
    if (!state || state.won) return;
    var hits = findMatch(true);
    if (!hits.length) { offerShuffle(); return; }
    var m = hits[rnd(hits.length)];
    clearHint();
    state.hints++;
    m.forEach(function (t) { t.el.classList.add('is-hint'); });
    hintTimeout = setTimeout(clearHint, 3200);
    saveGame();
  }

  function doShuffle(silent) {
    if (!state || state.won) return false;
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
    refresh();
    saveGame();
    if (!silent) toast('Shuffled — and still solvable');
    return true;
  }

  function offerShuffle() {
    pauseClock();
    var rescuable = !!planPairs(state.tiles);
    var canUndo = state.history.length > 0;
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
      function (s) {
        var btn = s.querySelector('[data-act="shuffle"]');
        if (btn) btn.onclick = function () { closeSheet(); resumeClock(); doShuffle(true); };
        btn = s.querySelector('[data-act="undo"]');
        if (btn) btn.onclick = function () { closeSheet(); resumeClock(); undo(); };
        s.querySelector('[data-act="restart"]').onclick = function () { closeSheet(); startGame(state.level); };
        s.querySelector('[data-act="menu"]').onclick = function () { closeSheet(); resumeClock(); toMenu(); };
      }
    );
  }

  /* ---------- win ---------- */
  function win() {
    state.won = true;
    pauseClock();
    clearInterval(timer);
    drop(STORE.save);
    Sound.unlock(); Sound.win();

    var secs = Math.round(state.elapsed);
    var lv = levelById(state.level);
    var st = stats[state.level] || { wins: 0, best: null };
    st.wins = (st.wins || 0) + 1;
    var isBest = st.best == null || secs < st.best;
    if (isBest) st.best = secs;
    stats[state.level] = st;
    store(STORE.stats, stats);

    confetti();
    var next = LEVELS[(LEVELS.indexOf(lv) + 1) % LEVELS.length];
    setTimeout(function () {
      openSheet(
        '<span class="big-emoji">🎉</span>' +
        '<h2>Zoo set free!</h2>' +
        '<p>' + lv.name + ' cleared' + (isBest ? ' — a new best time!' : '') + '</p>' +
        '<div class="result-grid">' +
          '<div><b>' + fmtTime(secs) + '</b><span>time</span></div>' +
          '<div><b>' + state.moves + '</b><span>moves</span></div>' +
          '<div><b>' + fmtTime(st.best) + '</b><span>best</span></div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn btn--primary" data-act="next">Play ' + next.name + '</button>' +
          '<button class="btn btn--ghost" data-act="again">Play ' + lv.name + ' again</button>' +
          '<button class="btn btn--ghost" data-act="menu">Back to menu</button>' +
        '</div>',
        function (s) {
          s.querySelector('[data-act="next"]').onclick = function () { closeSheet(); startGame(next.id); };
          s.querySelector('[data-act="again"]').onclick = function () { closeSheet(); startGame(lv.id); };
          s.querySelector('[data-act="menu"]').onclick = function () { closeSheet(); toMenu(); };
        }
      );
    }, 560);
  }

  function confetti() {
    var box = $('#confetti'), i, n, pick;
    box.innerHTML = '';
    for (i = 0; i < 26; i++) {
      pick = ANIMALS[rnd(ANIMALS.length)];
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
    saveGame();
    clearInterval(timer);
    clearHint();
    state = null;
    renderHome();
    show('home');
  }

  /* ---------- pause / how to play ---------- */
  function pauseMenu() {
    if (!state || state.won) return;
    pauseClock();
    openSheet(
      '<span class="big-emoji">⏸️</span>' +
      '<h2>Paused</h2>' +
      '<p>' + levelById(state.level).name + ' · ' + fmtTime(elapsedNow()) + '</p>' +
      '<div class="actions">' +
        '<button class="btn btn--primary" data-act="resume">Resume</button>' +
        '<button class="btn btn--ghost" data-act="restart">New board</button>' +
        '<button class="btn btn--ghost" data-act="menu">Back to menu</button>' +
      '</div>',
      function (s) {
        s.querySelector('[data-act="resume"]').onclick = function () { closeSheet(); resumeClock(); };
        s.querySelector('[data-act="restart"]').onclick = function () { closeSheet(); startGame(state.level); };
        s.querySelector('[data-act="menu"]').onclick = function () { closeSheet(); resumeClock(); toMenu(); };
      }
    );
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
  board.addEventListener('pointerdown', function (e) {
    var node = e.target.closest ? e.target.closest('.tile') : null;
    if (!node) return;
    e.preventDefault();
    var t = state && state.tiles[+node.dataset.i];
    if (t) tapTile(t);
  });

  $('#btn-back').addEventListener('click', toMenu);
  $('#btn-pause').addEventListener('click', pauseMenu);
  $('#btn-undo').addEventListener('click', function () { Sound.unlock(); undo(); });
  $('#btn-hint').addEventListener('click', function () { Sound.unlock(); hint(); });
  $('#btn-shuffle').addEventListener('click', function () {
    Sound.unlock();
    if (state && !state.won && !doShuffle()) offerShuffle();
  });
  $('#btn-how').addEventListener('click', howTo);
  $('#btn-install').addEventListener('click', installHelp);
  $('#btn-continue').addEventListener('click', function () {
    var saved = load(STORE.save, null);
    if (!saved || !restoreGame(saved)) { drop(STORE.save); renderHome(); }
  });

  var soundBtn = $('#btn-sound');
  function paintSound() {
    soundBtn.classList.toggle('is-muted', !settings.sound);
    $('#sound-label').textContent = settings.sound ? 'Sound' : 'Muted';
  }
  soundBtn.addEventListener('click', function () {
    settings.sound = !settings.sound;
    store(STORE.settings, settings);
    paintSound();
    if (settings.sound) { Sound.unlock(); Sound.tap(); }
  });

  $('#overlay').addEventListener('click', function (e) { if (e.target === $('#overlay')) { /* keep modal */ } });

  window.addEventListener('resize', fitBoard);
  window.addEventListener('orientationchange', function () { setTimeout(fitBoard, 260); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitBoard);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { pauseClock(); saveGame(); }
    else if (state && !state.won && !sheetOpen()) resumeClock();
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
      levels: LEVELS
    };
  }

  /* ---------- boot ---------- */
  paintSound();
  renderHome();
  show('home');

  if ('serviceWorker' in navigator && location.protocol !== 'file:' && location.search.indexOf('nosw') < 0) {
    window.addEventListener('load', function () {
      var hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('./sw.js').catch(function () {});
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (hadController && !window.__reloading) { window.__reloading = true; location.reload(); }
      });
    });
  }
})();
