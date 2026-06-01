# AETHER Runtime Charter

**Canonical execution truth for `aether-core/`**  
**Version:** 0.8.1  
**Supersedes conflicting claims in:** `Project/Info/*`, investor packages, archived roadmaps

---

## Authority hierarchy (single order of precedence)

1. **This charter** + [`truth-matrix.md`](./truth-matrix.md) + [`feature-status.json`](./feature-status.json)
2. [`release-gates.md`](./release-gates.md) — what must pass before pilot release
3. [`roadmap-alignment.md`](./roadmap-alignment.md) — phase mapping for planning only
4. `project-dna/` — vision and principles (not implementation status)
5. `Project/Info/` — **archived ambition docs**; never deployment truth

If any document conflicts with runtime evidence, **runtime wins**.

---

## Phase taxonomy (canonical — use this only)

| Phase | Period | Deliverable focus | Runtime status |
|-------|--------|-------------------|----------------|
| **Fase 0** | 2026 H1 | Foundation: modules, auth, CI, truth docs | **Complete** |
| **Fase 1** | 2026 H2 | Mail + Supplier + Admin v0.5 (Local AI First) | **Partial** |
| **Fase 2** | 2026–2027 | Event bus, attribution, Stripe, hive prep | **Partial** |
| **Fase 3** | 2027 | Orchestration + outcome productization | **Partial** |
| **Fase 4** | 2028 | Radical autonomy (gated rollout) | **Partial** |
| **Fase 5** | 2029 | Ecosystem expansion | **Partial** |

**Deprecated phase models:** Master Roadmap Fase 0–4 (Medusa-era), Expansion Plan Fase 1–4 (autonomy-first). Do not use for sprint planning.

---

## Commerce engine truth

- **Runtime:** Custom AETHER Core (Node.js + TypeScript + Prisma + PostgreSQL)
- **Not deployed:** MedusaJS (referenced only in archived `Project/Info/` docs)
- **Pivot status:** Documented here; no silent migration claim

---

## Local AI First policy

| Module | Requirement | Current runtime |
|--------|-------------|-----------------|
| AETHER Mail | Ollama path for classification; heuristic = escalation only | Partial — Ollama optional |
| Admin Command | Ollama parser with regex fallback | Partial |
| Supplier Intelligence | Scraping + rules; LLM optional | Implemented (non-LLM) |
| Agentic Commerce | LLM behind `AGENTIC_LLM_ENABLED` | Partial |

**Hard default:** `OLLAMA_BASE_URL` must be reachable in docker-compose stack. CI validates contract via health check.

---

## Claim policy (non-negotiable)

- No feature marked `implemented` without code + tests + row in `feature-status.json`
- No autonomy % without metric from `/api/admin/operating-metrics`
- No billable outcome without independent verification (see Outcome Truth Firewall)
- Partial/experimental labels are **honest**, not failures

---

## Archived doc inconsistencies (explicitly rejected)

| Claim (archived) | Runtime truth |
|------------------|---------------|
| Air-gapped inference containers | Not implemented — Ollama via HTTP |
| Zero-trust network mesh | API-key RBAC only |
| 70% mail autonomy | Not proven — measure auto-reply ratio |
| ZK-SNARK commerce | HMAC commitments only |
| MedusaJS commerce engine | Custom AETHER Core |
| Sprint 1–7 complete / IPO ready | v0.8.1 partial features |

---

## Definition of Done (world-class release)

**Pilot-ready (implemented):**
- [x] Single execution truth: this charter + truth-matrix + feature-status.json
- [x] Tenant context mandatory in repositories (no `tenant_default` schema defaults)
- [x] Clean Architecture boundary tests in CI
- [x] Event outbox; handlers complete before `processedAt`
- [x] Approval resolve executes registered actions (mail, supplier, refund, proposals)
- [x] Composition-root factories for mail process + supplier monitor jobs
- [x] Ollama in docker-compose + contract test; `OLLAMA_MODEL` env for Admin parser

**World-class (open — requires pilot metrics):**
- [ ] ≥70% mail auto-reply ratio over 30 days (`/api/emails/metrics`)
- [ ] Zero `approved` approvals without `action_executed` audit (enforced by ApprovalExecutor)
- [ ] ≥1 merchant with holdout-proven causal uplift on billable outcomes
- [x] Shared `LlmInferencePort` used by Mail classifier and Admin parser
- [x] LangGraph: not claimed in active runtime docs (vision docs bannered; see `AETHER_Master_Roadmap.md` header)

See [`first-principles-audit-2026-05-31.md`](./first-principles-audit-2026-05-31.md) for full gap analysis and P0–P3 backlog.

Last updated: First-Principles Audit implementation — 2026-05-31
