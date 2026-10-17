# Tina's Zoo Mahjong — working rules

A static PWA. No build step, no backend, no dependencies. Live at
**https://anderwonder911.github.io/tinas-zoo-mahjong/** (GitHub Pages, branch
`main`, repo `AnderWonder911/tinas-zoo-mahjong`).

## Standing rules for every change

1. **Deploy is part of the task — never ask first.** After any change:
   bump `VERSION` in `sw.js` (`zoo-v2` → `zoo-v3` …), commit with a short
   message, push to `main`.
2. **Verify it is actually live before saying "done".** Wait for the Pages
   build, then fetch the deployed worker and look for the new version:
   ```bash
   curl -s https://anderwonder911.github.io/tinas-zoo-mahjong/sw.js | grep VERSION
   ```
   Poll for up to ~3 minutes. Report "done" only after seeing the new VERSION
   live. If it never appears, say so plainly — do not claim success.
3. **Keep changes minimal.** Touch what the request needs and nothing else; no
   drive-by refactors, renames or reformatting of unrelated code.
4. **Test before pushing.** `node --check` every edited `.js`, and load the game
   with `?nosw=1&debug=1` on a local server (`python3 -m http.server 8765`) to
   check the change by hand. `?debug=1` also shows a small **win** button and exposes
   `window.__zoo` (`start(board, mode)`, `forceWin()`, `findMatch(all)`, `chase()`, `starve()`,
   `setIdleMs()`, `zoom`, `stats()`).

Why the VERSION bump matters: phones cache the game. Changing `VERSION` makes
the new service worker install, take over and refresh the app by itself, so the
home-screen app updates without ever being deleted and re-added.

## File layout

| File | What lives there |
|---|---|
| `index.html` | App shell: home, game screen, overlay sheet, **love screen markup**, iOS meta + launch-screen links |
| `app.css` | Everything visual. Sections are commented: Home, Game chrome, **Board & tiles**, **Love screen**, Overlay sheets, Confetti & toast |
| `app.js` | All game logic (one IIFE, plain ES5-style JS) |
| `js/love.js` | **`LOVE_MESSAGES` array at the very top**, the shuffle bag, and the love-screen controller (`window.ZooLove`) |
| `js/zoom.js` | Pinch / pan / double-tap for the big board (`window.ZooZoom`). All board taps go through it |
| `sw.js` | Offline cache. `VERSION` at line 2; `CORE` lists the files precached — add new files there |
| `manifest.webmanifest` | App name, icons, theme colour, standalone display |
| `icons/`, `splash/` | Icon (made from `icons/icon.svg`) and iPhone launch screens |

### Where the key things are in `app.js`

| Thing | Look for |
|---|---|
| Board shapes | `LEVELS` — the four small boards compose `rect(col, row, w, h, layer)` (whole tiles; stored as half-tile units, so a 0.5 step offsets by half a tile). **Safari** is `SAFARI_GRID`: five ASCII layers, `#` = tile, expanded by `fromGrid()` |
| Tile faces | `ANIMALS` (the four small boards), `SAFARI_POOL` (139 animals + nature for Safari's 126 types), `HEARTS` (love-screen confetti) |
| Chase timings | `CHASE_SECONDS` — seconds per pair, one line per board |
| Chase clock | `startChase` / `chaseStep` / `chaseRunning` (the pause rules live here) / `loseChase` |
| Zoom & pan | `js/zoom.js`; app side: `fitBoard()` (big boards use a fixed 46px tile and let the transform fit), `focusPair()` for hints, `ZooZoom.attach` in the wiring section |
| Settings & stats | `settings` + `applySettings` + `settingsSheet`; `statFor(board, mode)` holds per-mode records and migrates the old flat shape; `statsSheet` renders them |
| Solvable deals | `planPairs()` builds a removal order; `applyFaces()` paints animals onto it |
| Free / blocked rule | `isFree()` |
| Win screen | `win()` → `confetti(HEARTS)` → `window.ZooLove.show({time, best, again, menu})` |
| Tile size & 3D offsets | `fitBoard()` (`OX`, `OY`, `AR`) |
| Saved game | `saveGame()` / `restoreGame()`; **one slot per board**: `zoo.save.v1.<board>`, with `zoo.last.v1` pointing at the most recent. Other keys: `zoo.stats.v1`, `zoo.settings.v1`, `zoo.love.v1` |
| Resuming | Tapping a board that is in progress (in the current mode) picks it up; the card says "▸ in progress". A fresh deal comes from pause → New board |
| Self-update | bottom of the file: `controllerchange` → save game → `flagResume()` → reload; `takeResumeFlag()` restores the board after the refresh |

### Love messages

Add a line to `LOVE_MESSAGES` at the top of `js/love.js` — nothing else needs
touching. The bag (`zoo.love.v1` in localStorage) shows every message once
before any repeat, never repeats back-to-back across a reshuffle, and picks up
newly added lines immediately.

## Boards

| id | Name | Tiles | Notes |
|---|---|---|---|
| `meadow` | Meadow | 48 | 2 layers |
| `butterfly` | Butterfly | 72 | 3 layers, butterfly outline |
| `tortoise` | Tortoise | 108 | 4 layers |
| `tower` | Zoo Tower | 144 | 5 layers, the classic count |
| `safari` | Safari | 504 | 126 faces x 4, lion head, 5 layers, pinch to zoom |

Both modes run on any board: **Classic** (no clock) and **Chase** (`CHASE_SECONDS` per pair).
In Chase only the free no-move shuffle refills the clock; a shuffle she asks for does not.
A resumed Chase board starts its countdown fresh — the clock itself is not saved.
Changing a board's tile count means changing its faces too — Safari needs exactly
`tiles / 4` distinct entries available in `SAFARI_POOL` after `filterSupported()`.
