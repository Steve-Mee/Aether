# P2 — UI Quality Gates

**Harde releasevoorwaarden voor merchant-facing UI**  
**Version:** 1.0 | **Date:** 2026-06-01

---

## Design System v1

**Locatie:** `frontend/src/styles/tokens.css`, `frontend/src/components/ui/*`

### Tokens (verplicht)

- `--color-surface`, `--color-surface-elevated`, `--color-border`
- `--color-accent`, `--color-accent-muted`
- `--color-success`, `--color-warning`, `--color-danger`
- `--radius-sm|md|lg|xl`, `--space-*`, `--font-*`

### Primitives (verplicht gebruik)

| Primitive | Wanneer |
|-----------|---------|
| `Card` | Alle content containers |
| `Button` | Alle acties |
| `AsyncBoundary` | Alle data-fetch pages |
| `EmptyState` | Lege lijsten |
| `Skeleton` | Loading states |
| `RiskBadge` | AI confidence / approval risk |

### Verboden

- Ad-hoc `rounded-*` mix zonder token-equivalent
- Raw `fetch` + `useEffect` op nieuwe pages (gebruik `useAsyncData`)
- `outline-none` zonder zichtbare focus substitute

---

## Async UX gate

Elke pagina met API-data MOET:

1. Tonen `Skeleton` tijdens load
2. Tonen actionable error (retry-knop)
3. Tonen `EmptyState` met next-action hint
4. Geen flash van lege content

**Check:** `grep -L AsyncBoundary frontend/src/pages/*.tsx` → 0 op nieuwe pages

---

## Mobile gate

- Sidebar collapsed < `lg` breakpoint
- `MobileNav` bottom bar voor primary actions
- Command trigger bereikbaar in thumb zone
- Tables wrapped in `overflow-x-auto`

**Acceptatie:** 375px viewport — geen horizontal scroll op shell

---

## A11y gate (WCAG AA baseline)

| Check | Vereiste |
|-------|----------|
| Landmarks | `nav`, `main`, `complementary` op shell |
| Command input | `aria-label="Natuurlijke taal commando"` |
| Buttons | Accessible name (niet icon-only zonder label) |
| Focus | Zichtbare ring op interactieve elementen |
| Tabs | `role="tablist"`, `aria-selected` |
| Color | Status nooit alleen via kleur — altijd tekst/chip |

**CI (toekomst):** axe-core in frontend test suite

---

## i18n gate

- Alle user-facing strings via `t('key')` in `lib/i18n.ts`
- Geen gemengde NL/EN opzelfde scherm
- Datums via `formatDate(locale)`
- Valuta via `formatCurrency(locale, amount)`

**v1 locale:** `nl` default, `en` fallback

---

## Performance gate

- Route lazy loading via `React.lazy`
- Sidecar poll interval ≥ 30s (geen hammering)
- Geen unused deps in bundle (`framer-motion` gebruiken of verwijderen)

---

## Release checklist

```
[ ] Alle pages gebruiken AsyncBoundary of useAsyncData
[ ] Command palette keyboard-only werkend
[ ] Mobile 375px smoke test
[ ] Focus visible op alle interactives
[ ] i18n keys voor nieuwe strings
[ ] truth-status badges op partial features
```
