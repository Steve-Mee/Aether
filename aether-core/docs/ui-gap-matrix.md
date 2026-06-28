# AETHER UI Gap Matrix

**Execution truth vs roadmap UI beloftes**  
**Version:** 1.0 | **Date:** 2026-06-01  
**Authority:** [`runtime-charter.md`](./runtime-charter.md) + [`feature-status.json`](./feature-status.json)

---

## Bronhiërarchie

| Laag | Bron | Rol |
|------|------|-----|
| Runtime | `aether-core/frontend/`, `feature-status.json` | Wat merchants zien |
| Vision | `Project/Info/AETHER_Master_Roadmap_v1.2.md`, PoC specs | Wat beloofd is |
| Rejected | Medusa Admin extensies in `Project/admin/` | Niet deployed |

---

## Capability matrix

| Capability | Roadmap belofte | Acceptatiecriteria | Runtime status | Gap severity |
|------------|-----------------|-------------------|----------------|--------------|
| **AI-Native Command Center** | NL-first cockpit; backend via taal | Permanente bar; ≥40% acties via NL; NPS >70 | **Improved** — home landing (metrics, live summary, activity preview), NL hero, compound demo-flow, undo | Medium |
| **Global NL command bar** | Permanente slimme bar op subpagina's | Context suggesties + intent pill while typing | **Improved** — `NaturalLanguageBar` + `useSmartCommandInput` | Medium |
| **⌘K Command palette** | Globale search & command (PoC §3.2) | `Meta+K` opent palette; keyboard-only journey | **Implemented (P0)** — `CommandPalette.tsx` + contextual top row | Gesloten |
| **Voice input** | v0.5 voice op command bar | Speech-to-text → NL pipeline | **Demo enhanced** — hero mic pulse + STT → input (geen auto-submit) | Medium |
| **Proactive sidecar** | Contextueel meedenken op elke pagina | Realtime signalen; batch-acties | **Implemented** — SSE stream + fallback polling | Gesloten |
| **AI insights per pagina** | Anomalieën, suggesties, voorspellingen | Context-aware panel per route | **Partial** — sidecar globaal, geen per-route density | Medium |
| **Low Margin widget** | AI prijsvoorstellen (PoC widget 1) | Één-klik prijsoptimalisatie | **Partial** — via NL intent + dashboard metric | Medium |
| **Supplier Alerts widget** | Pending changes (PoC widget 2) | Alerts + approve flow | **Partial** — sidecar + suppliers page | Medium |
| **Mail Summary widget** | Openstaande mails (PoC widget 3) | NL + samenvatting | **Partial** — EMAIL_SUMMARY intent | Medium |
| **AETHER Mail inbox UI** | Unified inbox v1.0 | Thread view, draft, send | **Partial** — master-detail + draft + explain | Medium |
| **Mail approval queue** | Één-klik approve/reject + reason | Merchant-vriendelijke decision cards | **Implemented (P0)** — `DecisionCard` + explain | Gesloten |
| **Supplier config UI** | Per-leverancier config (PoC §2.7) | URLs, frequency, policy | **Partial** — create + monitor + pending changes | Medium |
| **Autonomous ops UI** | Decision log + confidence + trace | Explainability timeline | **Partial** — log + explain drawer | Medium |
| **Explainability UX** | Waarom stelde AI dit voor? | `/api/admin/explain` in UI | **Implemented** — `AgentExplainabilitySheet` (unified) | Gesloten |
| **Unified workstream** | Outcome-first, niet module-first | Mail+Supplier+Autonomy stream | **Implemented (P1)** — `/workstream` | Gesloten |
| **Approval policies** | Auto-approve onder drempel | Policy UI + uitzonderingstunnel | **Implemented** — Settings + auto-apply API | Gesloten |
| **Realtime dashboard** | Sub-second, live KPIs | Push of ≤5s polling | **Implemented** — SSE 5s + sidecar | Gesloten |
| **Design system** | Premium, consistent | Semantische tokens, primitives | **Implemented (P2)** — `tokens.css`, ui/* | Gesloten v1 |
| **Async UX** | Skeletons, optimistic, retry | Uniform per pagina | **Implemented** — AsyncBoundary op kernpages | Gesloten v1 |
| **Mobile cockpit** | Merchant overal | Collapsible nav, thumb zone | **Implemented (P2)** — `MobileNav` | Gesloten v1 |
| **A11y** | WCAG AA baseline | Keyboard, ARIA, focus | **Implemented** — skip link, palette trap, `test:a11y` in CI | Gesloten v1 |
| **i18n** | NL/EN merchant locales | Message keys, locale format | **Implemented** — sidecar, route hints, verify guards | Gesloten v1 |
| **Voice full / AR** | Admin v1.0 Fase 2 | Conversatie + AR overlay | **Afwezig** — P3 contracts only | Verwacht (2027) |
| **Zero-click optimizations** | AI initieert low-risk | Post-fact explain digest | **Spec (P3)** — `ui-p3-boundary-concepts.md` | Toekomst |
| **Causal outcome cockpit** | Holdout + confidence band | Live causal graph | **Spec (P3)** | Toekomst |

---

## Grootste kloven (prioriteit)

1. **Interaction model** — sidebar-first vs intent-first → **P0 reset**
2. **Proactief vs pull** — geen sidecar vóór P0 → **P0 sidecar**
3. **Raw payload approvals** — geen merchant-taal → **P0 DecisionCard**
4. **Explainability ongebruikt** — backend rijker dan UI → **unified AgentExplainabilitySheet**
5. **Module-silo's** — 12 losse pagina's → **P1 Workstream**

---

## Definition of Done per fase

### P0 (fundament)
- [x] Intent-first cockpit als default (`/`)
- [x] ⌘K command palette met suggested commands
- [x] Proactive sidecar met dashboard polling
- [x] Decision intelligence approvals

### P1 (autonomie)
- [x] Unified workstream (`/workstream`)
- [x] Explain drawer op approvals + autonomous
- [x] Policy-driven auto-approve UI — **unified under Settings → Autonomy** (`AutonomyConfigPanel` + `/api/admin/settings`; legacy `/api/admin/policies/approval` deprecated)

### P2 (kwaliteit)
- [x] Design tokens + ui primitives
- [x] AsyncBoundary pattern
- [x] Mobile nav + collapsible sidebar
- [x] A11y baseline (landmarks, aria-labels, focus rings)
- [x] i18n foundation

### P3 (10x)
- [x] Zero-click, causal, ambient, AR-ready specs in `ui-p3-boundary-concepts.md`

---

## Meetpunten (merchant success)

| Metric | Target (roadmap) | UI leverancier |
|--------|------------------|----------------|
| Acties via NL | ≥40–50% | Command OS logging |
| Tijd per taak | −35–40% | Workstream + sidecar |
| Admin NPS | >70 | Pilot survey |
| Approval tijd | <30s beslissing | DecisionCard + explain |
