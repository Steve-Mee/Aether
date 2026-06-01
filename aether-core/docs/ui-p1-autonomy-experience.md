# P1 — Unified AI Workstream & Explainability

**Status:** Implemented in `aether-core/frontend/`  
**Date:** 2026-06-01

---

## P1.1 Today's Outcomes Workstream

**Route:** `/workstream`  
**Component:** `pages/Workstream.tsx`

Aggregates prioritized actions from:

| Source | API | Priority signal |
|--------|-----|-----------------|
| Approvals | `GET /api/approvals` | pending count, risk band |
| Emails | `GET /api/emails` | escalated / unread |
| Autonomous | `GET /api/autonomous` | recent decisions |
| Dashboard | `GET /api/admin/dashboard` | low margin, uplift |

Each item renders as `OutcomeStreamItem` with:
- Expected impact (uplift estimate where available)
- One-click navigate + primary action
- Module badge (mail / supplier / autonomy)

---

## P1.2 Explainability-First UX

**Component:** `components/ExplainDrawer.tsx`

Consumes `GET /api/admin/explain?entityType=approval|email&entityId=`

Used on:
- `DecisionCard` — "Waarom?" button
- `Autonomous` page — per decision
- `Workstream` — inline expand

Timeline events show Dutch labels from backend `ExplainabilityService`.

---

## P1.3 Zero-Friction Approval Policies

**Status:** Implemented — `ApprovalPolicyPanel`, `/api/admin/policies/approval`, `POST /api/approvals/auto-apply`

### Planned UI (when API exists)

```typescript
interface ApprovalPolicy {
  module: string;
  autoApproveBelowRisk: 'low' | 'medium' | 'never';
  maxPriceChangePct: number;
  requireExplainFor: ('high')[];
}
```

Settings page section: "Autonomie policies" with sliders + preview.

---

## P1.4 Voice Lane

**Phase 1 (implemented):** Web Speech API button on CommandBar → fills input → submit  
**Phase 2:** TTS briefings, voice approve ("Goedkeuren")

Browser support: Chrome/Edge; graceful degradation on unsupported.

---

## Acceptatiecriteria

- [x] Workstream toont merged priority list
- [x] Explain drawer op approvals
- [x] Policy UI + auto-apply endpoint
- [x] Voice input stub
