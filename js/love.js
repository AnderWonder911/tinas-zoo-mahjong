/* =========================================================
   LOVE MESSAGES
   Add a new line here and it joins the rotation straight away.
   Every message is shown once before any of them repeats, and
   the same one never comes up twice in a row.
   ========================================================= */

var LOVE_MESSAGES = [
  'I love you',
  "You're the prettiest",
  "You're the best",
  'You make every day better',
  'My favourite person',
  "You're so clever",
  "I'm so lucky to have you",
  'You did it, my love',
  'Smartest girl in the zoo',
  'Forever yours'
];

/* ===================== end of messages ==================== */

window.ZooLove = (function () {
  'use strict';

  var KEY = 'zoo.love.v1';
  var mirror = null;          /* keeps the rotation honest if localStorage is unavailable */

  /* ---------- shuffle bag ---------- */

  function readBag() {
    var n = LOVE_MESSAGES.length, saved = mirror, bag, last, size, i;
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; } }
    if (!saved || !Array.isArray(saved.bag)) saved = { bag: [], last: null, size: n };

    /* drop anything the array no longer has, and any duplicates */
    bag = [];
    for (i = 0; i < saved.bag.length; i++) {
      var v = saved.bag[i];
      if (typeof v === 'number' && v === Math.floor(v) && v >= 0 && v < n && bag.indexOf(v) < 0) bag.push(v);
    }
    last = (typeof saved.last === 'number' && saved.last >= 0 && saved.last < n) ? saved.last : null;
    size = typeof saved.size === 'number' ? saved.size : n;

    /* messages added mid-cycle join the bag at once; an empty bag refills with all of them */
    if (bag.length && n > size) for (i = size; i < n; i++) if (bag.indexOf(i) < 0) bag.splice(rnd(bag.length + 1), 0, i);

    return { bag: bag, last: last, size: n };
  }

  function writeBag(s) {
    mirror = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
  }

  function rnd(n) { return Math.floor(Math.random() * n); }

  function fill(n, last) {
    var bag = [], i, j, t, k;
    for (i = 0; i < n; i++) bag.push(i);
    for (i = n - 1; i > 0; i--) { j = rnd(i + 1); t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
    /* a fresh bag must not open with the message that just played */
    if (n > 1 && last !== null && bag[0] === last) {
      k = 1 + rnd(n - 1);
      bag[0] = bag[k];
      bag[k] = last;
    }
    return bag;
  }

  /* Returns the next message, never the same one twice in a row, and every
     message once per cycle. */
  function nextMessage() {
    var n = LOVE_MESSAGES.length;
    if (!n) return '';
    var s = readBag();
    if (!s.bag.length) s.bag = fill(n, s.last);
    var idx = s.bag.shift();
    s.last = idx;
    writeBag(s);
    return LOVE_MESSAGES[idx];
  }

  /* ---------- the screen ---------- */

  var root, msgEl, statsEl, againBtn, menuBtn, onAgain, onMenu;

  function grab() {
    if (root) return;
    root = document.getElementById('love');
    msgEl = document.getElementById('love-message');
    statsEl = document.getElementById('love-stats');
    againBtn = document.getElementById('love-again');
    menuBtn = document.getElementById('love-menu');
    againBtn.addEventListener('click', function () { hide(); if (onAgain) onAgain(); });
    menuBtn.addEventListener('click', function () { hide(); if (onMenu) onMenu(); });
  }

  /* opts: {time, best, again, menu, message} */
  function show(opts) {
    grab();
    opts = opts || {};
    onAgain = opts.again;
    onMenu = opts.menu;
    msgEl.textContent = opts.message || nextMessage();
    statsEl.textContent = opts.time ? (opts.time + (opts.best ? '  ·  best ' + opts.best : '')) : '';
    root.hidden = false;
    /* restart the entrance animation on every win */
    root.classList.remove('is-in');
    void root.offsetWidth;
    root.classList.add('is-in');
  }

  function hide() {
    if (!root) return;
    root.hidden = true;
    root.classList.remove('is-in');
  }

  function isOpen() { return !!root && !root.hidden; }

  return {
    messages: LOVE_MESSAGES,
    next: nextMessage,
    show: show,
    hide: hide,
    isOpen: isOpen,
    peek: function () { return readBag(); }
  };
})();
