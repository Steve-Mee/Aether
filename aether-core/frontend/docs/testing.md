# Frontend testing

AETHER frontend tests follow a small pyramid: fast unit tests, integration tests for critical hooks, and Playwright for visual/a11y/flow checks.

## Commands (verify locally)

```bash
cd aether-core/frontend
npm run verify:ci          # fast CI parity (no Playwright)
npm run verify:ci:e2e      # full CI parity (+ Playwright)
```

Or step-by-step:

```bash
npm run lint
npm test
npm run test:coverage
npm run build && npm run test:flows
npm run test:visual
npm run test:a11y
```

| Script | What it runs |
|--------|----------------|
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Vitest — all `*.test.*` and `*.integration.test.*` under `src/` |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with coverage on `src/lib/**`, `src/hooks/**`, `src/features/**/hooks/**` |
| `npm run test:flows` | Playwright behavior flows (`e2e/flows/`) — requires `npm run build` first (preview on `:4173`) |
| `npm run test:visual` | Playwright visual regression (`e2e/visual/`) |
| `npm run test:a11y` | Playwright a11y — smoke, axe report, keyboard (`e2e/a11y/`). See [accessibility.md](./accessibility.md). |

**CI (frontend job):** `lint` → `lint:eslint` → `format:check` → `test` → `test:coverage` (informational) → `verify:copy` → build → `test:flows` → visual → a11y → `lint:a11y` (warn-only) → `audit:ci`.

**Playwright flows** seed auth via [`e2e/shared/auth.ts`](../e2e/shared/auth.ts) (`localStorage` session) before navigation. Use [`setupFlowPage()`](../e2e/shared/flow-helpers.ts) in new flow specs.

## When to use which layer?

| Situation | Layer |
|-----------|-------|
| Pure function, view model, reducer | Unit (`*.test.ts`) |
| Hook/context + cache, events, side effects | Integration (`*.integration.test.tsx`) |
| Full user path with routing and UI | E2E flow (`e2e/flows/*.spec.ts`) |
| Pixel/layout regression | Visual (`e2e/visual/`, snapshots) |

## Layout

```
src/
  test/
    setup.ts          # Vitest global setup (RTL, MSW, adapter reset, mockNotify export)
    render.tsx        # renderWithProviders / createHookWrapper / createCriticalFlowWrapper
    server.ts         # MSW Node server
    handlers/         # HTTP handlers (admin, approvals)
    fixtures/         # Shared JSON fixtures
    factories/        # buildApproval, buildCommandResult, …
    createTestDataAdapter.ts
    __tests__/
      criticalFlows.integration.test.tsx  # Cross-screen orchestration
  **/*.test.ts(x)     # Unit tests (pure logic)
  **/*.integration.test.tsx  # Hook / context integration

e2e/
  shared/             # auth session, flow-helpers, playwrightApiState
  visual/             # Screenshot baselines
  a11y/               # Landmark / skip-link smoke
  flows/              # Command + approvals behavior (no snapshots)
```

## Critical flow wrapper

For tests that span command → activity → notifications → home landing, use `createCriticalFlowWrapper()` from [`src/test/render.tsx`](../src/test/render.tsx):

```tsx
const { Wrapper, queryClient } = createCriticalFlowWrapper({
  initialEntries: ['/approvals'],
  adapter: createTestDataAdapter({ approvals: [...] }),
});

renderHook(() => useApprovalsPage(), { wrapper: Wrapper });
```

Provider stack (inner → outer): `CommandProvider` → `DashboardProvider` → `NotificationProvider` → `MerchantSettingsProvider` → `QueryInvalidationBridge` → `MemoryRouter` → `QueryClientProvider`.

Use `vi.mock('@/lib/config/env', …)` when the test needs `dataSource: 'mock'`. For component tests that use `NaturalLanguageBar`, mock `MerchantSettingsContext` (see `NaturalLanguageBar.integration.test.tsx`).

## Mocking

1. **Test data adapter** (primary for integration) — `setDataAdapterForTests(createTestDataAdapter({ … }))` exercises repositories and hooks without network.
2. **MSW** (contract) — `src/test/handlers/` mirrors production URLs; used in `httpAdapter.msw.integration.test.ts` with `env.dataSource === 'live'`.
3. **Playwright `page.route`** — `e2e/visual/mock-admin-api.ts` shares fixtures from `src/test/fixtures/` and mutable state in `e2e/shared/playwrightApiState.ts`.

Failure helpers for E2E: `setCommandExecuteFails(true)`, `setApprovalResolveFails(true)` in `playwrightApiState.ts`.

## Side-effect chains (architecture)

Understanding what each layer invalidates avoids false expectations in tests.

| Trigger | Immediate invalidation | Live bus / events |
|---------|------------------------|-------------------|
| `CommandContext` mutation success | `invalidateAfterCommandChange` — dashboard, **approvals**, activity, home-landing, autonomy-metrics, outcomes | `afterCommandExecuted` → activity item only (no notification); `COMMAND_EXECUTED_EVENT` |
| `COMMAND_EXECUTED_EVENT` (bridge) | activity, dashboard, home-landing, autonomy-metrics, outcomes — **not** approvals | — |
| `useApprovalsPage` resolve | `invalidateAfterApprovalChange` — approvals, dashboard, activity | `afterApprovalResolved` → activity; `notify()`; `aether:approvals-changed` |
| `aether:approvals-changed` (bridge) | approvals, dashboard | — |
| `afterSupplierSynced` | — (callers invalidate separately) | supplier change + notification events; bridge invalidates suppliers + activity |

## Covered flows

| Flow | Unit | Integration | E2E flow |
|------|------|-------------|----------|
| Intent detectie (typing) | `localIntentMatcher` | `useSmartCommandInput.integration.test.tsx` | — |
| Command Bar UI (submit / error / retry) | — | `NaturalLanguageBar.integration.test.tsx`, `CommandErrorCard.integration.test.tsx` | `command-bar.spec.ts` |
| Command execute + undo + error | `invalidateAfterMutation`, `sideEffects` | `CommandContext.integration.test.tsx`, `CommandResultCard.integration.test.tsx` | `command-bar.spec.ts`, `command-undo.spec.ts`, `command-palette.spec.ts` |
| High-risk approval resolve / reject + rollback | `approvalPresentation` | `useApprovalsPage.integration.test.tsx` (incl. reject failure), `ApprovalCard.integration.test.tsx` | `approvals-resolve.spec.ts`, `approvals-reject.spec.ts`, `approvals-resolve-failure.spec.ts`, `approvals-reject-failure.spec.ts` |
| Bulk approve / auto-apply + queue empty | — | `useApprovalsPage` (resolveMany, runAutoApply, queue empty) | `approvals-bulk.spec.ts` |
| Cross-screen orchestration (command + approval + inbox) | `sideEffects` | `criticalFlows.integration.test.tsx`, `QueryInvalidationBridge.integration.test.tsx`, `useActivityPage.integration.test.tsx`, `useHomeLanding.integration.test.tsx` | `cross-screen.spec.ts`, `activity-after-mutation.spec.ts`, `insights-after-command.spec.ts` |
| Error boundaries / critical dialog | — | `ErrorBoundary.test.tsx`, `AppErrorShell.integration.test.tsx` | — |
| HTTP adapter URLs + failures | — | `httpAdapter.msw.integration.test.ts` (dashboard, activity, settings, auto-apply, suggestions) | — |
| App shell pending count sync | — | `useApprovalsPage` (app shell store) | `cross-screen.spec.ts` (home high-risk metric before/after approve) |

## Adding a test

1. **Pure logic** — co-locate `*.test.ts` next to the module; no providers required.
2. **Hook / context** — add `*.integration.test.tsx`; use `createHookWrapper()`, `createCriticalFlowWrapper()`, or `renderWithProviders()` from `src/test/render.tsx`.
3. **New API** — extend `src/test/handlers/` and `createTestDataAdapter`; update `e2e/shared/playwrightApiState.ts` if E2E needs the same behavior.
4. **Factories** — add builders in `src/test/factories/` with fixed ISO timestamps (avoid `Date.now()` in assertions).
5. **E2E flow** — call `setupFlowPage(page)` in `beforeEach`; use `setCommandExecuteFails` / `setApprovalResolveFails` after setup for error paths.

## Conventions

- Arrange–act–assert; one behavior per `it`.
- `retry: false` on test `QueryClient` instances.
- Toast and `notify` are mocked in `src/test/setup.ts`; assert `notify` in integration tests where in-app notifications matter.
- Prefer `@testing-library/user-event` for click/type interactions in component tests.
