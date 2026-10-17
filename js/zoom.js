/* =========================================================
   Pinch / pan / double-tap for the big boards.
   One transform on one container: no per-tile work while a
   gesture is running, so 500+ tiles stay smooth.
   ========================================================= */
window.ZooZoom = (function () {
  'use strict';

  var MIN = 1, MAX = 4;          /* multiples of fit-to-screen */
  var TAP_SLOP = 14;             /* px of movement still counted as a tap (zoomable boards) */
  var TAP_TIME = 1200;           /* ms a tap may last: a resting finger still counts */
  var DBL_TIME = 330;            /* ms between the two taps of a double tap */

  var view, content, onTap, onDouble;
  var enabled = false;
  var fit = 1, user = 1, tx = 0, ty = 0;      /* scale = fit * user */
  var natW = 0, natH = 0;
  var pointers = {}, count = 0;
  var start = null, pinch = null;
  var lastTap = 0, lastTapX = 0, lastTapY = 0, lastTapEl = null;
  var moved = false;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function scale() { return fit * user; }

  /* the translate is measured from the viewport's own top-left, so every client
     coordinate has to be moved into that space before it is used as an anchor */
  function local(x, y) {
    var r = view.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top };
  }

  function clampPan() {
    var s = scale(), vw = view.clientWidth, vh = view.clientHeight;
    var w = natW * s, h = natH * s;
    tx = (w <= vw || !enabled) ? (vw - w) / 2 : clamp(tx, vw - w, 0);
    ty = (h <= vh || !enabled) ? (vh - h) / 2 : clamp(ty, vh - h, 0);
  }

  function apply(animate) {
    if (!content) return;
    content.style.transition = animate ? 'transform .34s cubic-bezier(.22,.9,.3,1)' : '';
    content.style.transform = 'translate3d(' + Math.round(tx) + 'px,' + Math.round(ty) + 'px,0) scale(' + scale().toFixed(4) + ')';
    if (view) view.classList.toggle('is-zoomed', user > 1.02);
  }

  /* ---------- public ---------- */

  function attach(opts) {
    view = opts.viewport;
    content = opts.content;
    onTap = opts.onTap;
    onDouble = opts.onDoubleTap;
    content.style.transformOrigin = '0 0';
    view.addEventListener('pointerdown', down);
    view.addEventListener('pointermove', move);
    view.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', cancel);
    view.addEventListener('contextmenu', function (e) { if (enabled) e.preventDefault(); });
  }

  /* natural size of the content and the scale that fits it on screen */
  function setContent(w, h, fitScale, allowZoom) {
    natW = w; natH = h; fit = fitScale;
    enabled = !!allowZoom;
    if (!enabled) user = 1;
    user = clamp(user, MIN, MAX);
    clampPan();
    apply(false);
  }

  function reset(animate) {
    user = 1;
    clampPan();
    apply(animate !== false);
  }

  function isZoomed() { return user > 1.02; }

  function zoomTo(userScale, cx, cy, animate) {
    if (!enabled) return;
    var pt = local(cx, cy);
    var prev = scale();
    var px = (pt.x - tx) / prev, py = (pt.y - ty) / prev;   /* board point under the finger */
    user = clamp(userScale, MIN, MAX);
    var s = scale();
    tx = pt.x - px * s;
    ty = pt.y - py * s;
    clampPan();
    apply(animate !== false);
  }

  /* bring a rectangle of board space into view (used by hints) */
  function focusRect(r, minUser) {
    if (!enabled) return;
    var vw = view.clientWidth, vh = view.clientHeight;
    var want = Math.max(user, minUser || 2);
    var fitW = (vw * 0.78) / (r.w * fit), fitH = (vh * 0.68) / (r.h * fit);
    want = clamp(Math.min(want, fitW, fitH), MIN, MAX);
    user = want;
    var s = scale();
    tx = vw / 2 - (r.x + r.w / 2) * s;
    ty = vh / 2 - (r.y + r.h / 2) * s;
    clampPan();
    apply(true);
  }

  /* ---------- gestures ---------- */

  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function list() { var out = [], k; for (k in pointers) out.push(pointers[k]); return out; }

  /* buttons sitting on top of the board (Fit) must behave like buttons */
  function onControl(target) {
    return !!(target && target.closest && target.closest('button, a, input, label'));
  }

  function seatPinch() {
    var p = list();
    if (p.length < 2) { pinch = null; return; }
    pinch = { d: dist(p[0], p[1]), m: local(mid(p[0], p[1]).x, mid(p[0], p[1]).y), user: user, tx: tx, ty: ty };
    moved = true;                         /* a pinch is never a tap */
    content.classList.add('is-gesturing');
  }

  function down(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (onControl(e.target)) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY, id: e.pointerId };
    count++;
    if (count === 1) {
      moved = false;
      start = { x: e.clientX, y: e.clientY, t: Date.now(), tx: tx, ty: ty, el: e.target };
      if (view.setPointerCapture) { try { view.setPointerCapture(e.pointerId); } catch (err) {} }
    } else if (enabled) {
      seatPinch();                        /* also re-seats when a third finger lands */
    }
  }

  function move(e) {
    var p = pointers[e.pointerId];
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;

    if (count >= 2 && pinch && enabled) {
      var pts = list();
      var d = dist(pts[0], pts[1]), m = local(mid(pts[0], pts[1]).x, mid(pts[0], pts[1]).y);
      if (pinch.d > 0) {
        var prevScale = fit * pinch.user;
        var bx = (pinch.m.x - pinch.tx) / prevScale, by = (pinch.m.y - pinch.ty) / prevScale;
        user = clamp(pinch.user * (d / pinch.d), MIN, MAX);
        var s = scale();
        tx = m.x - bx * s;
        ty = m.y - by * s;
        clampPan();
        apply(false);
      }
      e.preventDefault();
      return;
    }

    if (count === 1 && start) {
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) > TAP_SLOP) {
        moved = true;
        if (enabled && isZoomed()) content.classList.add('is-gesturing');
      }
      if (moved && enabled && isZoomed()) {
        tx = start.tx + dx;
        ty = start.ty + dy;
        clampPan();
        apply(false);
        e.preventDefault();
      }
    }
  }

  /* a cancelled touch (system gesture, call, notification) is not a tap */
  function cancel(e) {
    if (!pointers[e.pointerId]) return;
    delete pointers[e.pointerId];
    count = Math.max(0, count - 1);
    pinch = null;
    if (count === 0) { start = null; moved = false; content.classList.remove('is-gesturing'); }
    else seatRemaining();
  }

  /* after a finger lifts, whatever is still down starts from here */
  function seatRemaining() {
    var rest = list();
    if (rest.length >= 2 && enabled) { seatPinch(); return; }
    pinch = null;
    if (rest.length === 1) {
      start = { x: rest[0].x, y: rest[0].y, t: Date.now(), tx: tx, ty: ty, el: null };
      moved = true;                        /* the gesture already happened: not a tap */
    }
  }

  function up(e) {
    var p = pointers[e.pointerId];
    if (!p) return;                        /* a pointer we never tracked (a control) */
    delete pointers[e.pointerId];
    count = Math.max(0, count - 1);
    if (count > 0) { seatRemaining(); return; }
    pinch = null;

    content.classList.remove('is-gesturing');

    if (!p || !start) { start = null; return; }
    var dt = Date.now() - start.t;
    var far = Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP;
    /* nothing to confuse a tap with when the board cannot pan or zoom: be generous */
    var wasTap = enabled ? (!moved && !far && dt < TAP_TIME) : true;
    var el = start.el;
    start = null;
    if (!wasTap) return;

    var now = Date.now();
    var sameSpot = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 28;
    var sameEl = el === lastTapEl;
    if (enabled && now - lastTap < DBL_TIME && sameSpot && sameEl) {
      lastTap = 0; lastTapEl = null;
      if (onDouble) onDouble(e.clientX, e.clientY);
      return;
    }
    lastTap = now; lastTapX = e.clientX; lastTapY = e.clientY; lastTapEl = el;
    if (onTap) onTap(e.clientX, e.clientY);
  }

  return {
    attach: attach,
    setContent: setContent,
    reset: reset,
    zoomTo: zoomTo,
    focusRect: focusRect,
    isZoomed: isZoomed,
    enabled: function () { return enabled; },
    scale: function () { return scale(); },
    userScale: function () { return user; },
    offset: function () { return { x: tx, y: ty }; }
  };
})();
