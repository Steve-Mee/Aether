# Roadmap Alignment (aether-core)

**Canonical execution truth:** [`runtime-charter.md`](./runtime-charter.md)  
Reference archive: `Project/Info/` (not deployed).  
Runtime status: [`truth-matrix.md`](./truth-matrix.md) and [`feature-status.json`](./feature-status.json).

## Claim policy

No feature may be marked `implemented` in marketing or investor materials unless it has an honest row in `feature-status.json` **and** passes the relevant release gate in [`release-gates.md`](./release-gates.md).

## Phase mapping (2026–2029 plan)

| Roadmap phase | Year | aether-core target | Status |
|---------------|------|-------------------|--------|
| Fase 0 Foundation | 2026 H1 | Core modules + auth + CI + truth docs | **Complete** |
| Fase 1 AI Brain v0.5 | 2026 H2 | Mail + Supplier + Admin | **Partial** — mail heuristic fallback; parser-first admin |
| Fase 2 Hive / Pay | 2026–2027 | Event bus + attribution + Stripe | **Partial** — Stripe test-mode; causal MVP only |
| Fase 3 Orchestration + Outcomes | 2027 | Workflow graph, causal uplift, billing | **Partial** — TaskExecutor delegates; verified-only billing |
| Fase 4 Radical autonomy | 2028 | Agentic + self-evolving (gated) | **Partial** — persistent negotiation rounds; rollback endpoint |
| Fase 5 Ecosystem | 2029 | Co-ownership + physical (gated) | **Partial** — `ECOSYSTEM_JOBS_ENABLED` gate; mock device fallback |

## Do not mark complete until exit criteria met

- **Fase 3 (2027):** workflow graph with real module execution, causale uplift, billing on verified outcomes
- **Fase 4 (2028):** sandbox rollout with rollback proof, >70% autonomy metrics, compliance audits
- **Fase 5 (2029):** ecosystem load stability, anti-abuse controls, real hardware adapters

## Operating cadence

- Weekly: `node scripts/truth-review.js`
- Kill-fast: experimental features without merchant outcome in 2 iterations → pause
- Metrics: `/api/admin/operating-metrics` (tenant safety, autonomy, uplift, rollback)

Last updated: Elon-grade perfectie v0.8.1
