# AETHER Admin UI — Definition of Done

**Version:** 1.2 | **Date:** 2026-06-01

## Mission-worthy checklist (world-class metrics)

| Criterium | Status | Bewijs |
|-----------|--------|--------|
| `timeSavedMinutes7d` uit API | Done | `UiAdoptionMetricsService` + `OutcomeStrip` |
| `nlActionShare7d` uit API | Done | `AdoptionMetricCard` |
| Command timeline intent/confidence | Done | `PrismaCommandLogRepository.findRecent` + `ActionTimeline` |
| Activity log / audit trail | Done | `GET /api/admin/activity` + `/timeline` hybrid feed + sidebar nav |
| Nav telemetry | Done | `POST /api/admin/ui-event` + `useNavigationTelemetry` |
| Geen `zinc-*` op pages/components | Done | `verify:copy` zinc guard |
| Playwright visual smoke | Done | `e2e/visual/command-center.spec.ts` + CI |
| P3.1 digest (minimaal) | Done | `OvernightDigestCard` + `AutoRunWindowCard` → Settings |
| P3.2 confidence band (minimaal) | Done | `Outcomes.tsx` tabelkolom |

## NL-adoptie formule

```
nlActionShare7d = commands7d / max(1, commands7d + manualNavEvents7d)
```

- `commands7d`: NL-commando’s in `Command`-tabel (7 dagen)
- `manualNavEvents7d`: audit `ui.navigation` (7 dagen)
- Pilotdoel UI: **50%** (groen ≥50%, amber 30–49%, rood &lt;30%)

## Tijd bespaard

```
timeSavedMinutes7d = sum(minutesPerIntent(intent)) per command in 7d
```

Vastgelegd in [`UiAdoptionMetricsService.ts`](../backend/src/modules/admin-command-bar/application/services/UiAdoptionMetricsService.ts) — geen frontend-heuristiek.

## Verify lokaal

```bash
cd aether-core/frontend
npm run verify:ui
npm run test:visual
# eerste snapshot baseline:
npm run test:visual:update
```

## UI quality scorecard (2026-06, 10/10 excellence)

| Dimensie | Score | Bewijs |
|----------|-------|--------|
| Visuele consistentie | 10/10 | `space-y-6` + `RouteContextStrip` op alle module/overview pages; Emails master-detail onder `max-w-5xl` |
| Async UX | 10/10 | Dedicated skeletons; Settings single loading-pad; premium empty op kernroutes |
| Micro-interacties | 10/10 | `interactiveSurface` op lijsten/cards; `focusRing` op shell, palette, sheets |
| Command Bar | 10/10 | Palette dialog + focus trap + `aria-live`; NL-bar live region; undo API |
| Notificaties | 10/10 | Toast + inbox; action severity opent panel |
| A11y smoke | 10/10 | Skip link; **axe gate green on 9 routes**; combobox + **focus-restore `toBeFocused()`** + live-region e2e; `lint:a11y` in CI |
| i18n | 10/10 | Sidecar/suggestions/locale keys; `verify-ui-copy` EmptyState + sidecar guards |
| Intent-first | 10/10 | `RouteContext` modules (emails, orders, …); sidecar route boosts |
| E2E visual + a11y | 10/10 | CI: `verify:ui`, `test:visual`, `test:a11y` |

**Handmatige release-checklist (5 min):** Home, Approvals, Insights, Timeline, Suppliers, Settings, Workstream — mobile `<lg`, ⌘K, empty/error retry, `prefers-reduced-motion`. **SR spot-check:** see [`accessibility.md`](../frontend/docs/accessibility.md) NVDA checklist (10 items).

**Performance:** list virtualisatie uitgesteld tot pilot-lijsten >100 items (geen gemeten jank in demo).

## Command Bar intelligentie (frontend + backend, 2026-06)

| Dimensie | Score | Notities |
|----------|-------|----------|
| Command Center (`/`) | ~9/10 | Context suggesties, compound demo, hero bar |
| Product-brede NL bar | ~9/10 | API suggestions + `CommandResultCard` undo |
| Echte DB/API undo | ~8/10 | `UndoCommandUseCase` + audit `command.undo` |

## Nog open (business / 10x)

- ≥80% dagelijkse taken via NL (merchant-validatie, geen productmetric in UI)
- Module-pagina’s als context panels (volledige refactor)
- Volledige Optimization Window scheduler (P3.1 spec)
- Live causal graph (P3.2)
