# AETHER Admin Frontend

Intent-first merchant cockpit for AETHER Core v0.8.1+.

## Features

- **Intent-first cockpit** (`/`) — NL command timeline, quick intents, outcome metrics
- **⌘K Command palette** — keyboard-driven command OS with suggested commands
- **Proactive sidecar** — realtime signals (30s poll): approvals, margin, mail, uplift
- **Unified workstream** (`/workstream`) — Mail + Supplier + Autonomy priority stream
- **Decision intelligence** — approval cards with risk bands + explain drawer
- **Voice input** — Web Speech API stub (Chrome/Edge)
- **Design system v1** — tokens, Card/Button/AsyncBoundary primitives
- **Mobile shell** — collapsible nav, bottom command trigger
- **i18n foundation** — NL default via `lib/i18n.ts`

## Docs

- [UI gap matrix](../docs/ui-gap-matrix.md)
- [P0 interaction spec](../docs/ui-p0-interaction-spec.md)
- [P1 autonomy experience](../docs/ui-p1-autonomy-experience.md)
- [P2 quality gates](../docs/ui-p2-quality-gates.md)
- [P3 boundary concepts](../docs/ui-p3-boundary-concepts.md)

## How to run

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:9000 (Command Bar + sidecar require API)

## Keyboard

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `/` | Focus command bar |
| `Esc` | Close palette / explain drawer |
