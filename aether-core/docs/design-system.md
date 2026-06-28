# AETHER Design System

**Version:** 1.0 | **Scope:** `aether-core/frontend`

Calm, premium, AI-native UI primitives for the merchant operating system. One import path: `@/components/ui`.

---

## Design philosophy

- **Radical simplicity** — every surface earns its place; reduce before adding.
- **Calm autonomy** — AI actions feel confident, not noisy; status colors are intentional.
- **Premium through clarity** — spacing, typography, and motion create luxury—not decoration.

---

## Spacing

Use the 4px grid via CSS tokens (`--space-*`):

| Token | Value | Use |
|-------|-------|-----|
| `--space-4` | 1rem | Inline gaps, compact padding |
| `--space-6` | 1.5rem | Card padding, page gutters |
| `--space-8` | 2rem | Section gaps between blocks |
| `--space-10` | 2.5rem | Hero spacing |

Tailwind aliases: `p-aether-6`, `gap-aether-4`, etc.

---

## Typography

| Token | Use |
|-------|-----|
| `text-display` | Hero metrics, Command Center headlines |
| `text-headline` | Page titles |
| `text-title` | Card titles, panel headers |
| `text-body` | Default content (14px) |
| `text-meta` / `text-caption` | Labels, eyebrows, timestamps |

Weights: `font-normal`, `font-medium`, `font-semibold`. Prefer medium for interactive labels.

---

## Color

- **Accent (primary)** — main CTAs and focus rings; use sparingly.
- **Success / warning / danger** — status only; never for decoration.
- **Muted foreground** — secondary text; keep contrast readable.
- **Never** raw Tailwind `zinc-*` classes — CI guard enforces semantic tokens.

Tokens live in [`src/styles/tokens.css`](../frontend/src/styles/tokens.css); shadcn HSL vars sync via [`theme-bridge.css`](../frontend/src/styles/theme-bridge.css).

---

## Component choices

| Need | Component |
|------|-----------|
| Primary action | `Button variant="primary"` |
| Secondary / cancel | `Button variant="secondary"` or `ghost` |
| Destructive | `Button variant="danger"` |
| Glass CTA (Command Center) | `Button variant="premium"` |
| Content container | `Card variant="default"` |
| Elevated panel | `Card variant="elevated"` |
| AI insight / proactive card | `InsightCard` |
| NL command input | `CommandBar` |
| Global layout NL input | `CommandInput` (compact bar in `NaturalLanguageBar`) |
| Risk / status tag | `Badge variant="riskLow"` etc. |
| High-risk approval | `ApprovalDialog` |
| No data | `EmptyState variant="premium"` on primary pages |
| Fetch error (inline) | `ErrorState` — message + retry; used in `AsyncBoundary`, Settings page gate, Insights |
| Search / filter field | `SearchInput` — toolbar filters (Goedkeuringen, Activity, Leveranciers) |
| Form text input | `TextField` — labeled settings and modals |
| Async fetch | `AsyncBoundary` + layout skeleton (`CommandCenterSkeleton`, `ApprovalsPageSkeleton`, `InsightsPageSkeleton`, `ActivityPageSkeleton`, `ModuleListPageSkeleton`, `OutcomesPageSkeleton`, `SettingsSectionSkeleton`) |
| Shimmer placeholder | `Skeleton` (shimmer; static when `prefers-reduced-motion`) |
| Clickable rows / cards | `interactiveSurface()` from `@/lib/utils` |
| Focus ring (keyboard) | `focusRing()` from `@/lib/utils` — shell nav, sheets, command palette |
| App brand / logo | `AetherBrandMark` — sidebar, mobile nav, top bar |
| Tab / period filters | `SegmentedControl` |
| Page title block | `PageHeader` + optional `StatChip` children |
| Content width | `max-w-5xl` (default); `max-w-4xl` (dense lists: Goedkeuringen, Activity); Emails uses `max-w-5xl` + inner master-detail flex |
| Skip to content | `Layout` skip link → `#main-content` (`a11y.skipToMain`) |
| Toast feedback | `Toaster` (sonner) + `showCalmToast` from `@/lib/toast` |
| In-app notifications | `NotificationBell` + `NotificationPanel` (global shell); `warning` / `action` severity also triggers `showCalmToast` |

---

## Motion (v2)

| Token | Use |
|-------|-----|
| `--transition-fast` (150ms) | Hover, focus, button press |
| `--transition-normal` (250ms) | Panel enter, Command Bar focus |
| `--transition-slow` (400ms) | Page-level transitions only |

| Animation | When to use | Avoid |
|-----------|-------------|-------|
| `animate-fade-in` | Panel enter, async content reveal, toasts | On every list item |
| `animate-highlight-pulse` | Live data highlight (supplier change, command target) | Idle state |
| `animate-card-enter` / `animate-card-exit` | Today Ready insight add/remove only | All cards on mount |
| Skeleton shimmer | `AsyncBoundary` loading only | Static content |

Rules: no infinite loops except unread-dot pulse (`motion-safe:`). Always prefix hover lift with `motion-safe:`. Respect `prefers-reduced-motion` via Tailwind `motion-safe:` and static skeletons when reduced motion is set.

**Loading:** Prefer page-specific skeletons via `AsyncBoundary`’s `skeleton` prop—not generic blocks on primary pages.

**Empty states:** `EmptyState variant="premium"` with optional `hint`, `actionLabel` / `onAction` on Command Center, Goedkeuringen, and Inzichten.

---

## Import convention

```tsx
import { Button, Card, InsightCard, EmptyState } from '@/components/ui';
```

Do **not** import from `@/components/shadcn` in pages or feature code. Shadcn folder is CLI internals only.

---

## Verification

```bash
cd aether-core/frontend
npm run verify:ui
npm run test:visual
```
