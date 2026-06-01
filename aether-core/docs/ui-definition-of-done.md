# AETHER Admin UI — Definition of Done

**Version:** 1.2 | **Date:** 2026-06-01

## Mission-worthy checklist (world-class metrics)

| Criterium | Status | Bewijs |
|-----------|--------|--------|
| `timeSavedMinutes7d` uit API | Done | `UiAdoptionMetricsService` + `OutcomeStrip` |
| `nlActionShare7d` uit API | Done | `AdoptionMetricCard` |
| Command timeline intent/confidence | Done | `PrismaCommandLogRepository.findRecent` + `ActionTimeline` |
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

## Nog open (business / 10x)

- ≥80% dagelijkse taken via NL (merchant-validatie, geen productmetric in UI)
- Module-pagina’s als context panels (volledige refactor)
- Volledige Optimization Window scheduler (P3.1 spec)
- Live causal graph (P3.2)
