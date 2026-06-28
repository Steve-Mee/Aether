# P0 — Interaction Model Reset

**Status:** Implemented in `aether-core/frontend/`  
**Date:** 2026-06-01

## Doel

Vervang route-first admin panel door intent-first merchant cockpit. NL wordt primaire bedieningslaag; sidebar wordt secundair.

## Componenten

| Component | Pad | Functie |
|-----------|-----|---------|
| IntentCockpit | `pages/IntentCockpit.tsx` | Default view: outcomes, suggested intents, command timeline |
| CommandPalette | `components/CommandPalette.tsx` | ⌘K overlay, suggested commands, keyboard nav |
| CommandContext | `lib/CommandContext.tsx` | Global command state, intent→route navigation |
| ProactiveSidecar | `components/ProactiveSidecar.tsx` | Realtime signals (30s poll), batch links |
| DecisionCard | `components/DecisionCard.tsx` | Approval UX: why/impact/risk, explain trigger |
| AgentExplainabilitySheet | `components/explainability/AgentExplainabilitySheet.tsx` | `/api/admin/explain` timeline |

## Intent → route mapping

```
LOW_MARGIN_REPORT      → /products
EMAIL_SUMMARY          → /emails
PENDING_APPROVALS      → /approvals
SUPPLIER_MONITOR       → /suppliers
INVENTORY_STATUS       → /products
ORDER_STATUS           → /orders
OUTCOMES_REPORT        → /outcomes
```

## Keyboard

- `Meta+K` / `Ctrl+K` — open command palette
- `Escape` — close palette / drawer
- `/` — focus command bar (when not in input)

## Risk bands (approvals)

| Band | Criteria | UI |
|------|----------|-----|
| low | mail auto-reply, <5% price change | green chip |
| medium | supplier sync, negotiation | amber chip |
| high | refund, >10% price, new product | red chip + explain required |

## Niet in P0 scope

- WebSocket push (polling v1)
- Full voice conversation
- AR overlays
