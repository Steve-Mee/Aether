# Accessibility (WCAG 2.1 AA)

AETHER admin frontend targets **WCAG 2.1 Level AA** on core merchant routes.

## Automated checks

```bash
cd aether-core/frontend
npm run build
npm run test:a11y          # Playwright: smoke + axe gate + keyboard + focus + live regions
npm run lint:a11y          # eslint-plugin-jsx-a11y (warn-only)
```

| Suite | Purpose |
|-------|---------|
| `e2e/a11y/a11y-smoke.spec.ts` | Landmarks, `h1`, skip-link activation |
| `e2e/a11y/axe-routes.spec.ts` | axe-core — **hard fail** on 9 core routes; report-only on `/login` |
| `e2e/a11y/combobox.spec.ts` | Global NL bar `ArrowDown` + `aria-activedescendant` |
| `e2e/a11y/focus-restore.spec.ts` | Mobile nav + command palette Escape; **`toBeFocused()` on trigger** |
| `e2e/a11y/live-regions.spec.ts` | Polite + assertive live regions present |
| `e2e/a11y/sidebar-keyboard.spec.ts` | Sidebar active link focusable |
| `e2e/a11y/keyboard-navigation.spec.ts` | Combobox input, mobile nav Escape |
| `e2e/a11y/approvals-bulk.spec.ts` | Bulk checkbox labeling |

CI runs `test:a11y` + `lint:a11y`. Playwright HTML report uploaded as artifact (`playwright-a11y-report`).

## Component patterns

| Pattern | Implementation |
|---------|----------------|
| Skip link | `AppShell` → `#main-content` (`tabIndex={-1}`) |
| Overlays | Radix `Sheet` / `Dialog` (focus trap, Escape, restore) |
| NL command bar | `role="combobox"`, `aria-activedescendant`, `aria-describedby` idle hint |
| Notifications | `NotificationPopover` + bell `PopoverAnchor`; info pushes → `announceStatus` |
| Status messages | `LiveAnnouncer` (polite + assertive); errors via `announceAssertive` + toast |
| Approval success | Single channel: `ApprovalSuccessBanner` on Approvals; inbox push uses `skipAnnounce` (no duplicate LiveAnnouncer) |
| Filter toggles | `SegmentedControl` arrow keys + `aria-pressed` |
| Settings | `SettingRow` with `htmlFor` + `aria-describedby` on controls |
| Lists | Semantic `<ul role="list">` on Approvals recent, Suppliers, Activity |
| Caption contrast | `text-caption-accessible` utility |

| Command Center status | Inline `aria-live="polite"` on response card — no duplicate `announce()` |

## Manual checklist (~5 min)

1. **Keyboard only** — Tab through Home, Approvals, Insights, Activity, Suppliers, Settings.
2. **Skip link** — Tab once on load → Enter → focus lands in main.
3. **Command bar** — Type, ArrowDown through suggestions, Enter to run; hear result (NVDA/VoiceOver).
4. **Command palette** — Ctrl+K → Escape; focus returns sensibly.
5. **Notifications** — Bell opens panel; unread count in label.
6. **Sheet** — Open activity/supplier detail → Tab trapped → Escape closes.
7. **Approvals bulk** — Select item; checkbox name announced; success banner once.

## NVDA / VoiceOver checklist (~10 min)

Use with NVDA (Windows) or VoiceOver (macOS) on a production preview build.

1. **Skip link** — Tab once → Enter → focus in main; hear landmark change.
2. **Command bar** — Type a command, ArrowDown through suggestions, Enter; hear result once (polite live region).
3. **Command palette** — Ctrl+K from NL bar → Escape; focus returns to combobox (not lost to body).
4. **Mobile nav** — Open menu → Escape; focus returns to menu button.
5. **Notifications** — Bell opens panel; unread count in button label; new info items announced once (not doubled with banner on Approvals).
6. **Approvals resolve** — Approve one item; hear success **once** via banner (`role="status"`), not repeated via LiveAnnouncer.
7. **Error toast** — Trigger a resolve failure or supplier validation error; hear assertive alert (`role="alert"`), not polite-only.
8. **Command execute** — Run autonomous demo command; hear execution confirmation from response card live region only.
9. **Activity sheet** — Open row detail → Tab through related links with visible focus ring → Escape closes.
10. **Segmented control** — Settings or Activity period: ArrowLeft/ArrowRight moves between segments.

## Known follow-ups

- `/login` deep route: promote to strict gate when auth shell stabilizes
- List virtualisation a11y when lists exceed 100 items
- Expand `eslint-plugin-jsx-a11y` rules from warn-only to error on new code

See also: [`a11y-baseline.md`](./a11y-baseline.md) (axe + Lighthouse snapshot).
