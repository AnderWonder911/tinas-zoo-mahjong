# Tina's Zoo Mahjong 🐼

A cosy animal mahjong solitaire, built as an installable web app for iPhone.

**Play it: https://anderwonder911.github.io/tinas-zoo-mahjong/**

Open the link on an iPhone and it plays straight away in Safari — no account, no
sign-up, no app store. Tap **Share → Add to Home Screen** and it becomes a full
screen app with its own icon that also works with no internet at all.

## The game

Match two free animals to send them home; clear the board to win.
A tile is free when nothing sits on top of it and its left or right side is open
— covered tiles are dimmed.

Four boards, each shaped to fit a phone screen in portrait:

| Board | Tiles | Layers |
|---|---|---|
| Meadow | 48 | 2 |
| Butterfly | 72 | 3 |
| Tortoise | 108 | 4 |
| Zoo Tower | 144 | 5 |

Every deal is built backwards from a verified removal order, so **each board can
always be solved**. If a board does get stuck, *Shuffle* re-deals the remaining
tiles the same way; when the last tiles are stacked on each other (the one case
no shuffle can fix) the game says so and offers Undo instead.

Clearing a board opens a love screen: a burning heart, a message from the
rotation in `js/love.js`, heart confetti, and the time and best time underneath.

Also in: hints, unlimited undo, a pause screen, best times per board, sound you
can mute, and an auto-saved game that survives closing the app — including across
an update, where the app refreshes itself and drops straight back into the board.

## How it is built

Static files, no build step, no backend, no dependencies, no cost.

| File | What it does |
|---|---|
| `index.html` | App shell, iOS meta tags, launch-screen links |
| `app.css` | All styling: tiles, layout, sheets, safe areas |
| `app.js` | Layouts, solvable deal generator, game loop, storage |
| `sw.js` | Service worker — caches the game for offline play |
| `manifest.webmanifest` | Name, icon, colours, standalone display |
| `icons/`, `splash/` | App icon and iPhone launch screens |

Animals are emoji, so the whole game is well under 1 MB and renders with the
phone's own artwork. Progress, settings and best times live in `localStorage` on
the device; nothing is ever sent anywhere.

## Changing it

Edit the files, then:

```bash
git add -A && git commit -m "your change" && git push
```

GitHub Pages rebuilds in about a minute. Bump `VERSION` in `sw.js` (e.g.
`zoo-v2`) when you change `app.js` or `app.css` so phones that already have the
game pick the new version up immediately.

To preview locally:

```bash
python3 -m http.server 8765
```

then open http://localhost:8765. Two URL flags help while developing:
`?nosw=1` skips the service worker (so you always see fresh files) and
`?debug=1` exposes `window.__zoo` for poking at the game state from the console.
