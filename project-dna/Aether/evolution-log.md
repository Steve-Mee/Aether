# Evolution Log

This file tracks significant learnings, architectural decisions, and evolutionary steps in the AETHER project.

## Format
- **Date**: YYYY-MM-DD
- **Change / Decision**: Short description
- **Reasoning**: Why this was done
- **Impact**: Expected or observed effect

---

## Entries

### 2026-05-29
- **Added initial Project DNA structure for AETHER**
  - Created vision.md, principles.md, architecture.md, anti-patterns.md, and this evolution-log.md.
  - Created project-specific AGENTS.md.
  - Reason: Establish a clear foundation aligned with radical simplicity and merchant autonomy.
  - Impact: Provides a structured source of truth for vision, principles, and guardrails.

### 2026-05-29
- **Recognized opportunity to strengthen Recursive Self-Improvement**
  - Noted that the system would benefit from a more explicit meta-evolution process, similar to Lumina.
  - This is tracked for future improvement.

### 2026-07-26
- **Storefront Builder + Merchant Dashboard designed (spec only)**
  - **Change / Decision:** Adopt AI code-generation for merchant storefronts via an **allowlisted AST/DSL** that compiles into a fixed `storefront-runtime` (Next.js) host. No arbitrary server-side Node from agents. Publish is always high-risk → Approvals. Merchant dashboard IA extended for full commerce backoffice (products/orders/customers/inventory/website/CMS) while Command Center stays primary.
  - **Reasoning:** Vision promises “prompt → live store”; runtime had zero storefront code. Freeform codegen is unsafe; allowlisted artifacts still deliver real generated TSX/CSS revisions with sandbox + QA. Dashboard list-only pages are insufficient for merchant self-serve.
  - **Impact:** Specs landed under `project-dna/Aether/storefront-builder.md` and `aether-core/docs/storefront-*.md` + `merchant-dashboard-ia.md`. Truth matrix marks `storefront-builder` and `merchant-dashboard-commerce-ui` as `planned`. Progress snapshot: `aether-core/docs/progress-overview-2026-07.md`. No runtime implementation in this change.

### 2026-07-26
- **P05 — AllowlistCodegenCompiler (runtime)**
  - **Change / Decision:** Replace codegen stub with Zod-validated SitePlan compiler. Allowlisted blocks only; unknown types and v1 `overrides/*.tsx` → `CODEGEN_REJECTED`. Emits `plan.json`, `tokens.json`, `tokens.css`, `pages/*.tree.json`, `copy/*.json`, `qa-report.json` placeholder. Wired into CreateSiteProject / CreateRevision + `attachCompiledArtifacts`.
  - **Reasoning:** Agents (P06) need a hard security boundary before any plan reaches the artifact store.
  - **Impact:** Contract for P06: [`aether-core/docs/storefront-site-plan-schema.md`](../../aether-core/docs/storefront-site-plan-schema.md). Overrides AST allowlist deferred; explicit refuse.

### 2026-07-26
- **P07 — STORE_* intents + PUBLISH_STOREFRONT ApprovalExecutor**
  - **Change / Decision:** Wire NL `STORE_BUILD|ITERATE|PUBLISH|STATUS` into Command Center `matchIntent` + fallback handlers; register `StorefrontPublishApprovalHandler` that calls `DeployPort.deploy` then `SiteRepository.markProjectLive`. `STOREFRONT_DEPLOY_ENABLED=false` → stub-success with `staged=true` (CI); DB still goes live. Frontend `INTENT_ROUTES` + `/website` sidecar boost.
  - **Reasoning:** Publish must never auto-deploy; approval-execute is the only path to live. Stub-success keeps CI green without Cloudflare/Vercel.
  - **Impact:** DeployPort contract finalized for P08 preview/live URLs. Real edge providers still out of scope.

### 2026-07-26
- **P06 — Storefront specialist agents (runtime)**
  - **Change / Decision:** Register `store_builder`, `design`, `copy_seo`, `store_qa` with tools wired to storefront-builder use-cases. `proposePublish` creates approval only (never DeployPort). LLM via `LlmInferencePort` with deterministic allowlisted SitePlan fallbacks for CI.
  - **Reasoning:** Department charter §5 — brief → design/copy → codegen/build → propose publish under human control.
  - **Impact:** Intents for P07 parser: `STORE_BUILD`, `STORE_ITERATE`, `STORE_PUBLISH`, `STORE_STATUS` (+ peer `DESIGN_PROPOSE`, `COPY_PROPOSE`, `STORE_QA`).

### 2026-07-28
- **Storefront Birth runtime — P15 hardening close-out (honest status)**
  - **Change / Decision:** Vertical slice P01–P15 complete for **local** demo only: public slug fail-closed gate, SitePlan page-path traversal reject, RBAC source audit + website.* event assertions, extra deterministic codegen fuzz, deleted dead `NoopPreviewHostAdapter`, `/website/*` axe + preview SegmentedControl + product tab keyboard. Feature-status / truth-matrix remain **partial** — not pilot edge-deploy “live”; no “60s live store” claim.
  - **Reasoning:** Intellectual honesty — Birth e2e proves create→build→approve→public GET; deploy defaults staged; production stays fail-closed until flags + HMAC secret + pilot gates.
  - **Impact:** Operators can demo locally with flags on. Planned-only backlog: Redis rate limits, real CDN deploy, Lighthouse CI gate, fast-check fuzz, multi-region, hive-mind distillation.

### 2026-07-26
- **Storefront Builder runtime v0.x shipped (honest status)**
  - **Change / Decision:** Vertical slice P01–P15 complete enough for local demo: allowlisted codegen, Website admin UI, public `/api/storefront`, preview HMAC, approval-gated publish, cart/checkout, P15 hardening (RBAC audit, slug/path guards + post-resolve containment, rate limits, business events, security checklist, `/website` axe + detail a11y smoke). Feature-status / truth-matrix remain **partial** — not pilot edge-deploy “live”.
  - **Reasoning:** Intellectual honesty — E2E proves create→build→approve→public GET; deploy defaults staged; no “60s live store” marketing.
  - **Impact:** Operators can demo locally with flags on; production stays fail-closed until flags + HMAC secret + pilot gates. Planned-only backlog: Redis rate limits, real CDN deploy providers, Lighthouse CI gate, fast-check fuzz.

---

*This log will be expanded over time as the system evolves.*
