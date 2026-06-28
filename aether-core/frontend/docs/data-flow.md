# Data flow & state strategy

**Stack:** TanStack Query (server state) + Zustand (shell/UI) + `lib/data` repositories.

## Layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Types | `src/types/` | Domain entities (approval, activity, supplier, command, insight, notification) |
| Adapters | `src/lib/data/adapters/` | `HttpDataAdapter` (default) or `MockDataAdapter` (`VITE_DATA_SOURCE=mock`) |
| Repositories | `src/lib/data/repositories/` | Typed operations — no React |
| Feature API | `src/features/*/api.ts` | Thin exports for hooks |
| Query hooks | `features/*/hooks`, `hooks/` | `useAetherQuery` / `useMutation` + cache keys |
| View models | `lib/merge*`, `*Presentation.ts` | Demo padding when API is partial/empty |
| Client shell | `lib/stores/appShellStore.ts` | Badge counts, last command timestamp |

## Request flow

```
Page → useXPage hook → repository → getDataAdapter() → HTTP or mock
       ↓ mutation success
       invalidateAfter* + aetherLiveBus + CustomEvent (approvals/command)
       ↓
       Other screens refetch via QueryInvalidationBridge
```

## Adding a feature

1. Add types in `src/types/<domain>.ts` and export from `src/types/index.ts`
2. Extend `DataAdapter` + both adapters
3. Add `repositories/<domain>Repository.ts`
4. Add `queryKeys` entry in `lib/query/keys.ts`
5. Add `features/<domain>/api.ts` and `useXPage` hook
6. Thin page in `pages/`

## Mock vs live

- **live** (default): `HttpDataAdapter` → backend on `VITE_API_URL`
- **mock**: `VITE_DATA_SOURCE=mock` — full offline UI with demo seeds (orders, products, emails, settings, dashboard, suppliers, approvals, …)
- **Hybrid**: `VITE_LIVE_DEMO` + `merge*ViewModel` still pad thin/partial API responses (labeled `live` / `demo` in UI)

See [`error-handling.md`](error-handling.md) for retry, logging, and UX policy.

## Repositories (full list)

| Repository | Domains |
|------------|---------|
| `approvalsRepository` | Approvals resolve / auto-apply |
| `activityRepository` | Activity feed |
| `suppliersRepository` | Suppliers CRUD, monitor, changes |
| `insightsRepository` | Outcomes, autonomy metrics, billing |
| `commandsRepository` | NL command execute / undo / history |
| `notificationsRepository` | Mock inbox |
| `ordersRepository` | Orders list |
| `productsRepository` | Products list |
| `emailsRepository` | Emails list + detail |
| `negotiationsRepository` | Agentic negotiations |
| `autonomousRepository` | Autonomous decisions |
| `dashboardRepository` | Dashboard summary |
| `settingsRepository` | Merchant settings, connected services, metrics |
| `adminRepository` | Truth status, explain, trace, suggestions, truth review |

## Cross-screen invalidation

| Event | Invalidates |
|-------|-------------|
| Approval resolve | `approvals`, `dashboard`, `activity`, `homeLanding`, `outcomes`, `autonomy-metrics` |
| Command execute/undo | `dashboard`, `approvals`, `activity`, `homeLanding`, `outcomes`, `autonomy-metrics`, `commands.history` |
| Supplier monitor/patch | `suppliers`, `activity`, `dashboard` |
| Truth review submit | `operating-metrics`, `truth-status` |
| Live bus activity | `activity`, `homeLanding`, `autonomy-metrics` |

Optimistic insights bumps patch **all cached** `autonomy-metrics` keys (7d / 30d / 90d) before refetch.

## Side effects (instant cross-screen UX)

After successful mutations, [`lib/data/sideEffects.ts`](../src/lib/data/sideEffects.ts) dispatches live-bus events (activity row, notification) **in addition to** query invalidation:

| Mutation | Helper |
|----------|--------|
| Approval resolve | `afterApprovalResolved` (activity row + notification) |
| Supplier monitor/sync | `afterSupplierSynced` |
| Command execute | `afterCommandExecuted` |

## Command bar

- **Global bar** (`NaturalLanguageBar`): `CommandContext` → `commandsRepository` via `features/commands`.
- **Command Center demo flow** (`useCommandDemoFlow`): same `executeCommand`; surfaces errors via `CommandErrorCard` when live API fails without `VITE_LIVE_DEMO` fallback.
- **Suggestions**: `useSmartCommandInput` loads via `adminRepository.suggestions`; falls back to local matcher on error.

## Supplier changes API

`GET /api/suppliers/changes?status=` is exposed via `suppliersRepository.fetchChanges()` and prefetched in `useSuppliersPage`.

## Notifications

- **Live:** client inbox via `NotificationContext` + live bus (no backend feed yet).
- **Mock (`VITE_DATA_SOURCE=mock`):** inbox seeded from `notificationsRepository.list()`.

## Approvals Recent tab

`useApprovalsPage` hydrates the Recent tab from `activity` API (`category === 'approval'`, last 7 days) and merges with session-handled items (session wins on overlap).
