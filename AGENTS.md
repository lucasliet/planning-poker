# Planning Poker — Agent Notes

## Project type

Static website (no build, no bundler, no package manager). Open `index.html` directly in a browser — no HTTP server required.

## Architecture

Four IIFE modules loaded as global `<script>` tags in dependency order:

1. `js/state.js` — `State` singleton (single source of truth for app state)
2. `js/peer.js` — `PeerManager` (PeerJS/WebRTC networking)
3. `js/ui.js` — `UI` (all DOM rendering and interaction)
4. `js/main.js` — Event wiring and host/guest orchestration (entry point)

These are **not ES modules** — each exposes a single global (`State`, `PeerManager`, `UI`). Script load order in `index.html` is the dependency graph.

PeerJS is loaded from CDN (`unpkg.com/peerjs@1.5.4`), not npm.

## P2P topology

Star topology: host is the central node. Guests never communicate with each other. Host broadcasts state snapshots; guests send discrete messages (`join`, `vote`, `issue`).

Peer IDs are prefixed with `ppk-`. Room codes are 6-char uppercase alphanumeric.

No persistence — closing the browser ends the session.

## Conventions

- All user-facing strings are in **Portuguese (pt-BR)**. Keep it that way.
- Card scale: extended Fibonacci — `0 1 2 3 5 8 13 21 34 55 89 ?` and coffee emoji.
- `State.RED_SUITS` marks high-value cards (`21`, `34`, `55`, `89`, `?`, coffee) with red styling.
- CSS uses a poker-felt theme (`--felt`, `--gold`, `--cream` CSS custom properties in `css/style.css`).

## Testing

No test infrastructure exists. There is no `package.json`, no linter, no CI.

## Deploy

Any static file host (GitHub Pages, Netlify, Vercel, nginx). No build step.
