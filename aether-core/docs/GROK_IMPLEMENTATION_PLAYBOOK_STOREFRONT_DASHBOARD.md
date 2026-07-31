# Grok Implementation Playbook — Storefront Builder + Merchant Dashboard

**Version:** 2.1 — Birth Perfect  
**Audience:** Grok 4.5 (or equivalent) in Cursor  
**Mode:** One prompt = one new chat (bounded context)  
**Progress snapshot:** [`progress-overview-2026-07.md`](./progress-overview-2026-07.md)  
**Failure playbook:** Appendix J

**Specs (source of truth for behavior):**

| Spec | Path |
|------|------|
| Department charter | `project-dna/Aether/storefront-builder.md` |
| Architecture | `aether-core/docs/storefront-architecture.md` |
| API contracts | `aether-core/docs/storefront-api-contracts.md` |
| Dashboard IA | `aether-core/docs/merchant-dashboard-ia.md` |
| Runtime truth | `aether-core/docs/runtime-charter.md` |
| Feature status | `aether-core/docs/feature-status.json` + `truth-matrix.md` |

**Do not edit:** `.cursor/plans/*` plan files.  
**Locked decisions:** Appendix G (no A/B choices during implementation).  
**Canonical fixtures:** Appendix H.

---

## Audit (v1.0 → v2.0 → v2.1)

| Plan / eis | v1.0 | v2.0 | v2.1 |
|------------|------|------|------|
| Oorspronkelijk playbook-plan (GLOBAL + P01–P15 + appendix) | Ja | Ja | Ja |
| Birth Upgrade (P00, Gate, Elon Algorithm, G/H/I) | Nee | Ja (~95%) | Ja |
| Link `progress-overview-2026-07.md` | Nee | Ja | Ja |
| Geen zachte A/B in Birth-kritieke prompts | Nee | Deels | **Ja** |
| Complete Appendix H (alle plan-pages + copy) | Nee | Alleen home | **Ja** |
| Birth First Principles physics | Nee | Nee | **Ja** |
| Locked TTL / rate / QA / e2e path | Nee | Nee | **Ja** |
| Failure & rollback (Appendix J) | Nee | Nee | **Ja** |

**Verdict:** v1.0/v2.0 plannen zijn **uitgevoerd**. v2.1 = residual Elon polish → **Birth Perfect**.  
Runtime-build start pas na P00…Gate volgens dit document — dit bestand blijft docs-only instructie.

---

## 0. Operator handleiding

### Hoe te gebruiken

1. Open een **nieuwe Cursor Agent chat** per prompt (`P00` … `P15`, plus `BIRTH GATE`).
2. Plak eerst het **GLOBAL SYSTEM PROMPT** (sectie 2).
3. Plak daarna de **Pn** (of BIRTH GATE) prompt.
4. Agent moet Elon Algorithm stappen 1–2 expliciet in de response zetten vóór code.
5. DoD groen → pas door naar volgende.
6. Commit alleen als de mens dat vraagt.
7. **Na P10: verplicht BIRTH GATE.** Fail → fix. Nooit P11 starten zonder gate PASS.

### Volgorde (Birth eerst)

```
P00 → P01 → P02 → P03 → P04 → P05 → P06 → P07 → P08 → P09 → P10
  → BIRTH GATE (must PASS)
  → P11 → P12 → P13 → P14 → P15
```

### Verplichte reads (elke chat)

- `project-dna/Aether/vision.md`
- `project-dna/Aether/architecture.md`
- `.cursor/skills/aether-principles-guard/SKILL.md`
- `.cursor/skills/token-efficiency/SKILL.md`
- `.cursor/skills/brain-architecture/SKILL.md` (als brain geraakt)
- `.cursor/skills/multi-agent-orchestration/SKILL.md` (vanaf P06)
- Dit playbook Appendix G + de specs in die Pn

### Hard rules

1. Custom AETHER Core only — geen MedusaJS; geen LangGraph-as-runtime claims.
2. Tenant isolation overal.
3. Allowlisted codegen only — **geen** `overrides/*.tsx` in v1 (reject).
4. Publish = Approvals only.
5. Local AI First — `LlmInferencePort` / Ollama; cloud alleen opt-in.
6. Intellectual honesty — truth docs alleen updaten met evidence (P14).
7. Mirror `product-catalog` + `getCompositionRoot()` + `featureGate()` + Approval handlers.
8. Frontend: extend `aether-core/frontend`; Command Center blijft primary.
9. **Geen implementatie-keuzes buiten Appendix G** — als iets ontbreekt: stop en vraag de mens.

### Stopcondities

- Lint + relevante tests + build groen
- Geen secrets
- Geen scope creep
- Elon delete-pass: geen dode abstracties / unused flags / duplicate paths

---

## 1. Birth — wat “geboren” moet zijn

**Birth** = de kleinste closed loop die bewijst dat AETHER een storefront-organisme is:

```text
brief → SiteRevision → allowlisted compile → preview URL
  → PUBLISH_STOREFRONT approval → execute
  → public GET /api/storefront/:slug/pages?path=/
```

### First Principles — physics of Birth

**Problem (physics):** A merchant must sell online. Today that requires engineers, themes, and unsafe “AI wrote my Next.js app”. AETHER must produce a **sellable public page tree** from a brief without arbitrary code execution.

**True constraints (not opinions):**

1. Customer must see a page resolved by tenant slug (public read).
2. Merchant must iterate safely (revisions, preview, not silent overwrite of live).
3. High-impact go-live must be human-gated (Approvals).
4. Generated UI must be bounded (allowlisted blocks only) — security is a constraint, not a feature.
5. Local AI First: CI and sensitive paths must work without cloud LLM.

**Non-goals for Birth (delete these urges):**

- Drag-drop page builders, freeform TSX overrides, MedusaJS, multi-region CDN, “60s live” marketing claims without e2e evidence.
- Full commerce CRUD (P11+) before the Birth loop is proven.

**Proof:** one automated e2e at the locked path below. If it fails, Birth is not born — stop expanding.

### Birth success metrics (meetbaar)

| Metric | Target |
|--------|--------|
| Freeform server codegen | **0** |
| Auto-publish zonder approval | **0** |
| Feature flags default | **off** (`storefront-builder`, `storefront-public-api`) |
| Preview port | **4177** |
| Preview token TTL | **15 minutes** |
| Public API rate limit | **60 req/min/IP** (in-memory) |
| QA publish gate | Propose publish **rejected** if `qaScore < 0.80` → `QA_BELOW_THRESHOLD` |
| Vertical-slice e2e | `aether-core/backend/src/modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts` **green** |
| Truth claim “live store in 60s” | **Verboden** tot evidence |

### Elon Algorithm (verplicht elke chat — vóór code)

1. **Question** every requirement in this Pn — is it needed for Birth / merchant ROI?
2. **Delete** any part, process, or abstraction you can.
3. **Simplify** what remains.
4. **Accelerate** cycle time (fewer files, fewer hops, faster tests).
5. **Automate** only after the above.

Als stap 1–2 niet in je antwoord staan: stop en herstart denken.  
Bij Gate FAIL: zie **Appendix J** — fix Birth only, never start P11.

---

## 2. GLOBAL SYSTEM PROMPT

Kopieer dit blok **als eerste bericht** in elke implementatiechat:

```text
Je bent Cursor Grok die AETHER bouwt — AI-native merchant OS (levend organisme, geen “webshop SaaS”).

ELON MUSK MINDSET (ALWAYS ON):
- First Principles: breek af tot fysica/constraints; “onmogelijk” = nog niet opgelost.
- Radical Simplicity: minste moving parts die merchant ROI leveren.
- Boundary Pushing: durf 10x; verwerp feature-bloat.
- 100% Intellectual Honesty: geen pleasen, geen fake live-claims.
- Proactive 10x: “Hoe maken we dit onverslaanbaar én bewijsbaar?”

ELON ALGORITHM (doe dit EXPLICIET vóór je code schrijft):
1) Question every requirement in this Pn
2) Delete parts/processes you can
3) Simplify/optimize
4) Accelerate cycle time
5) Automate last
Merchant Success First: verdienen we alleen als de merchant wint? Local AI First. Autonomy with control.

STACK (runtime truth):
- Backend: aether-core/backend — Node + TS + Express + Prisma + PostgreSQL
- Frontend admin: aether-core/frontend — Vite + React 18 + RR v6 + TanStack Query + Zustand
- AI: Orchestrator, PersonalBrain, multi-agent specialists, LlmInferencePort/Ollama
- Composition: getCompositionRoot() in bootstrap/compositionRoot.ts
- Auth: DB API keys + tenant header + RBAC (viewer GET / operator mutations)
- Approvals: shared/approval + ApprovalExecutor
- Feature flags: shared/features/featureFlags.ts + featureGate()

LOCKED DECISIONS (Appendix G van GROK_IMPLEMENTATION_PLAYBOOK — niet heronderhandelen):
- Media: MediaAsset + ProductMedia (geen Json blob)
- P01 schema: Site* + Category + Media + Cart/CartItem + Promotion + Shipment + Refund — all required
- P01 seed: 1 tenant + 1 product WITH ≥1 ProductMedia (placeholder URL allowed)
- TSX overrides: REJECT in v1
- Flags: featureGate('storefront-builder') + FEATURE_STOREFRONT_BUILDER; alias STOREFRONT_BUILDER_ENABLED sets same
- Public: featureGate('storefront-public-api') + FEATURE_STOREFRONT_PUBLIC_API
- Deploy: StubDeployAdapter always sets liveRevisionId + status=live locally; STOREFRONT_DEPLOY_ENABLED=true only adds log deploy.provider=stub — NO external CDN in Birth
- Preview port: 4177; preview token TTL: 15 minutes
- Public rate limit: 60 req/min/IP
- QA publish: reject if qaScore < 0.80 (QA_BELOW_THRESHOLD) — REQUIRED
- Birth e2e path: modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts
- Birth Gate after P10 before P11; on FAIL see Appendix J
- Fixtures: Appendix H SitePlan + ALL page trees + copy/nl.json — agents MUST conform
- P00 handoff: chat report only — NO separate BIRTH_READY.md file

PATRONEN:
- modules/<name>/{api,application,domain,infrastructure}
- Controllers/routers → getCompositionRoot() use-cases
- Agents: ai/intelligence/multi-agent/agents/* + index.ts
- Approval handlers: shared/approval/handlers/*
- Frontend routes: frontend/src/lib/navigation/routes.ts

VERBODEN:
- MedusaJS / LangGraph-as-runtime claims
- Vrije server codegen (eval, fs, child_process, raw SQL in artifacts)
- Auto-publish storefront
- Truth live/implemented zonder tests
- Scope buiten Pn
- “Kies A of B” soft options — Appendix G is wet
- .cursor/plans/* editen
- Na P10 door naar P11 zonder BIRTH GATE PASS

WERKWIJZE:
1. Lees Reads + Appendix G/H
2. Schrijf Elon Algorithm 1–2 outcome in chat
3. todo_write bij 3+ stappen
4. Implementeer minimaal-compleet
5. Tests (happy + failure/security)
6. lint/typecheck/tests
7. Handoff voor volgende Pn
8. Commit alleen op expliciet verzoek

DoD (elke Pn):
- [ ] Deliverables op paden
- [ ] Tenant scoping
- [ ] Tests happy + ≥1 failure/security
- [ ] Builds groen
- [ ] Geen regressie architecture.test.ts / validate-dod waar geraakt
- [ ] Handoff-samenvatting
- [ ] Niets gebouwd dat Appendix G verbiedt
```

---

## 3. Sequenced prompts

---

### P00 — Bootstrap & truth freeze

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P00 — Bootstrap & truth freeze

### Elon Algorithm (verplicht antwoord vóór actie)
1. Question: Wat is het minimum om Birth te kunnen starten zonder te liegen over runtime status?
2. Delete: Geen nieuwe features in P00 — alleen readiness.

### Doel
Freeze truth, verify toolchain, document env keys, prepare seed hooks. STOP als validate-dod faalt.

### Reads
- aether-core/docs/runtime-charter.md
- aether-core/docs/truth-matrix.md
- aether-core/docs/feature-status.json
- aether-core/docs/progress-overview-2026-07.md
- aether-core/docs/GROK_IMPLEMENTATION_PLAYBOOK_STOREFRONT_DASHBOARD.md (Appendix G, C)
- aether-core/backend/.env.example (of create keys section)

### Deliverables
1. Run `node aether-core/scripts/validate-dod.js` — must PASS; if fail, fix only truth-sync issues, nothing else
2. Confirm feature-status has storefront-builder + merchant-dashboard-commerce-ui as `planned`
3. Add/document env keys in backend `.env.example`:
   - FEATURE_STOREFRONT_BUILDER=false
   - STOREFRONT_BUILDER_ENABLED=false  (alias — must map to same flag in code later)
   - FEATURE_STOREFRONT_PUBLIC_API=false
   - STOREFRONT_DEPLOY_ENABLED=false
   - STOREFRONT_ARTIFACTS_DIR=tmp/storefront-artifacts
   - STOREFRONT_PREVIEW_PORT=4177
   - STOREFRONT_PREVIEW_HMAC_SECRET= (placeholder; required non-test later)
4. Seed plan note (implement in P01): tenant + demo product “Kom Aarde” **with** ≥1 ProductMedia — document seed IDs in handoff
5. Handoff chat section ONLY (no separate BIRTH_READY.md file): end with exact line `P00 PASS — proceed P01`

### Acceptance tests
- validate-dod PASS
- .env.example contains locked keys with defaults off / port 4177
- No schema/API code in this chat unless required to unblock validate-dod
- No BIRTH_READY.md file created

### Out of scope
- Site models, APIs, UI, agents

### Handoff
Env key list + seed intent + confirm truth still planned + `P00 PASS — proceed P01`.
```

---

### P01 — Prisma Site* + commerce schema (LOCKED)

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P01 — Prisma schema for Storefront + commerce gaps

### Elon Algorithm
1. Question: Welke tabellen zijn strikt nodig voor Birth + latere P11/P13 zonder schema-churn?
2. Delete: Geen Json blob images; geen “later misschien” tabellen — ofwel in P01 of nooit in Birth.

### Doel
Volledig schema per Appendix G. Geen HTTP.

### Reads
- aether-core/docs/storefront-architecture.md (§3)
- aether-core/docs/storefront-api-contracts.md (§2–3)
- aether-core/docs/merchant-dashboard-ia.md (§6)
- aether-core/backend/prisma/schema.prisma
- Playbook Appendix G

### Deliverables (ALL required — no options)
1. SiteProject, SiteRevision, SitePage, SiteAsset, BuildJob, DeployTarget (fields per architecture §3.1)
2. Category (tenantId, name, slug, parentId?) @@unique([tenantId, slug])
3. MediaAsset + ProductMedia join (productId, mediaAssetId, sortOrder) — Product gets seoTitle?, seoDescription?, categoryId?
4. Cart, CartItem
5. Promotion (minimal: tenantId, name, type, status, configJson, window starts/ends)
6. Shipment, Refund (minimal fields for order UI)
7. Migration `*_storefront_builder`
8. Seed **required**: 1 tenant + ≥1 product **with** ≥1 ProductMedia row (placeholder URL allowed, e.g. `https://placehold.co/600x400`) — usable for Birth slug/catalog tests
9. prisma validate + generate

### Acceptance tests
- migrate/generate succeeds
- @@unique([tenantId, slug]) on SiteProject and Category
- Smoke: migration folder exists; schema includes Cart and ProductMedia
- Seed creates ProductMedia (≥1)

### Out of scope
- HTTP, agents, frontend, codegen

### Handoff
Migration folder name + model list exact + seed IDs.
```

---

### P02 — storefront-builder module skeleton

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P02 — storefront-builder module skeleton

### Elon Algorithm
1. Question: Welke use-cases zijn nodig vóór HTTP (P03)?
2. Delete: Geen extra service layers boven use-cases.

### Doel
Clean-arch module + compositionRoot wiring; stub ports; unit-tested CreateSiteProject.

### Reads
- storefront-architecture.md (§2, §4)
- modules/product-catalog/ (mirror)
- bootstrap/compositionRoot.ts
- __tests__/architecture.test.ts

### Deliverables
Path: aether-core/backend/src/modules/storefront-builder/

```
storefront-builder/
  index.ts
  domain/entities/{SiteProject,SiteRevision,SitePage,BuildJob}.ts
  domain/repositories/SiteRepository.ts
  application/ports/{ArtifactStorePort,CodegenCompilerPort,PreviewHostPort,DeployPort,StorefrontCatalogPort}.ts
  application/use-cases/
    CreateSiteProjectUseCase.ts
    GetSiteProjectUseCase.ts
    ListSiteProjectsUseCase.ts
    CreateRevisionUseCase.ts
    ListRevisionsUseCase.ts
    GetRevisionUseCase.ts
    ListPagesUseCase.ts
    GetPageUseCase.ts
    StartBuildUseCase.ts
    GetBuildJobUseCase.ts
    ProposePublishUseCase.ts
  infrastructure/persistence/PrismaSiteRepository.ts
  infrastructure/artifacts/LocalFsArtifactStoreAdapter.ts
  infrastructure/codegen/AllowlistCodegenCompilerStub.ts  # replaced in P05; MUST emit Appendix H–compatible trees
  infrastructure/preview/NoopPreviewHostAdapter.ts
  infrastructure/deploy/StubDeployAdapter.ts
  __tests__/CreateSiteProjectUseCase.test.ts
```

- Wire in compositionRoot
- STOREFRONT_ARTIFACTS_DIR default `tmp/storefront-artifacts`
- Stub compiler output MUST match Appendix H block types only

### Acceptance tests
- CreateSiteProject: project+revision+queued BuildJob; duplicate slug rejected
- All repo reads/writes tenant-scoped
- architecture.test.ts green

### Out of scope
- Express routers, agents, real AST compiler, frontend

### Handoff
compositionRoot keys; stub vs real port map for P03–P08.
```

---

### P03 — Admin Website API

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P03 — Admin Website API `/api/website/*`

### Elon Algorithm
1. Question: Welke endpoints zijn Birth-kritiek vs nice-to-have? (Answer: all of contracts §1 — implement all, no subset excuses.)
2. Delete: No parallel controller framework — single router file.

### Doel
All admin endpoints per storefront-api-contracts.md §1 behind featureGate('storefront-builder').

### Reads
- storefront-api-contracts.md (§1, §6)
- featureFlags.ts
- ProductController.ts + app.ts route registration

### Deliverables
1. Flag key `storefront-builder` default false; FEATURE_STOREFRONT_BUILDER; alias STOREFRONT_BUILDER_ENABLED → same isFeatureEnabled path
2. **Only** `modules/storefront-builder/api/websiteRouter.ts` (no alternate controller style)
3. Endpoints exactly:
   - POST/GET /api/website/projects
   - GET /api/website/projects/:projectId
   - POST/GET /api/website/projects/:projectId/revisions
   - GET /api/website/revisions/:revisionId
   - GET /api/website/revisions/:revisionId/pages
   - GET /api/website/pages/:pageId
   - POST /api/website/revisions/:revisionId/build
   - GET /api/website/builds/:buildId
   - POST /api/website/revisions/:revisionId/publish → pending approval module=`storefront-builder` action=`PUBLISH_STOREFRONT` — does NOT go live
   - GET /api/website/preview/:revisionId
   - GET/PUT /api/website/projects/:projectId/deploy-target
4. RBAC viewer/operator
5. Errors: WEBSITE_DISABLED, PROJECT_NOT_FOUND, REVISION_NOT_READY, SLUG_TAKEN, CODEGEN_REJECTED
6. HTTP tests with flag on/off
7. Stub OpenAPI file `aether-core/backend/openapi/website.yaml` covering §1 paths (minimal but real)

### Acceptance tests
- Flag off → 403 gated
- Create 201 shape matches contracts
- Cross-tenant 404
- Publish → approval pending, project not live

### Out of scope
- Public storefront, agents, UI, real CDN deploy

### Handoff
Exact approval payload JSON for P07.
```

---

### P04 — Public Storefront read API

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P04 — Public Storefront read API

### Elon Algorithm
1. Question: Wat moet public zijn voor Birth? Site + catalog + product + pages. Cart = P13.
2. Delete: No admin auth on public routes.

### Doel
Public read API §2.1–2.4 + preview token verify helpers.

### Reads
- storefront-api-contracts.md (§2.1–2.4)
- storefront-architecture.md (§6.3)

### Deliverables
1. featureGate('storefront-public-api') + FEATURE_STOREFRONT_PUBLIC_API
2. Routes:
   - GET /api/storefront/:tenantSlug
   - GET /api/storefront/:tenantSlug/catalog
   - GET /api/storefront/:tenantSlug/products/:slug
   - GET /api/storefront/:tenantSlug/pages?path=
3. Resolve tenant via SiteProject.slug
4. Live from liveRevisionId; Preview via `Authorization: Preview <token>` HMAC TTL **15 minutes**
5. Export signPreviewToken / verifyPreviewToken helpers (TTL locked 15m)
6. Rate-limit middleware: **60 req/min/IP** in-memory (locked); document constant in code
7. Never leak other tenants' projects/revisions
8. Tests: live happy path, unknown slug 404, preview success/fail/expired, tenant isolation, rate-limit 429 after burst

### Acceptance tests
- Unknown slug 404
- Preview token success/fail/expired (TTL 15m)
- No cross-tenant leak
- Flag off gated
- Rate limit 60/min/IP enforced in test

### Out of scope
- Cart/checkout, admin UI, agents

### Handoff
Token helper import paths for P08/P09 (TTL=15m).
```

---

### P05 — Codegen compiler + allowlist (LOCKED)

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P05 — Allowlisted Codegen Compiler

### Elon Algorithm
1. Question: Kunnen we overrides/*.tsx weglaten? YES — Appendix G: REJECT.
2. Delete: Any path that writes executable server code.

### Doel
Real AllowlistCodegenCompiler; fixtures Appendix H are normative.

### Reads
- project-dna/Aether/storefront-builder.md (§4)
- storefront-architecture.md (§3.3)
- Playbook Appendix H
- CodegenCompilerPort.ts

### Deliverables
1. AllowlistCodegenCompiler.ts replacing stub
2. Allowlisted blocks ONLY (charter list)
3. Zod (or equiv) validate treeJson — unknown type → CODEGEN_REJECTED
4. Emit: plan.json, tokens.json, tokens.css, pages/*.tree.json, copy/*.json, qa-report.json placeholder
5. **If input requests overrides/*.tsx → reject with CODEGEN_REJECTED** (no parser, no AST allowlist complexity in v1)
6. Wire into CreateRevision / StartBuild
7. Unit tests: Appendix H **all** page trees compile (home, products, pdp, about, contact, legal) + copy/nl.json emitted; unknown block fails; snapshot deterministic; override attempt fails

### Acceptance tests
- Appendix H fixtures compile (all pages + copy)
- Unknown block rejected
- Override rejected
- Deterministic snapshot

### Out of scope
- LLM agents, Next.js, deploy

### Handoff
“Appendix H is the contract for P06 fallback plans.”
```

---

### P06 — Storefront agents

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P06 — StoreBuilder / Design / CopySeo / StoreQA agents

### Elon Algorithm
1. Question: Is LLM required for Birth CI? No — deterministic fallback MUST work without Ollama.
2. Delete: No agent that can emit non-allowlisted blocks.

### Doel
Four specialists + tools; fallback plans === Appendix H shape.

### Reads
- storefront-builder.md (§5)
- merchant-agent-patterns.md
- multi-agent-orchestration skill
- CatalogAgent.ts + agents/index.ts
- Appendix H

### Deliverables
1. StoreBuilderAgent (store_builder), DesignAgent (design), CopySeoAgent (copy_seo), StoreQAAgent (store_qa)
2. Tools: createSiteProject, createRevisionFromBrief, runBuild, proposePublish, proposeLayout, proposeTokens, proposePageTree, proposeCopy, proposeMeta, localize, runBuildChecks, runLighthouse (stub scores), diffRevisions
3. Register in DEFAULT_SPECIALIST_AGENTS
4. Intents: STORE_BUILD, STORE_ITERATE, STORE_PUBLISH, STORE_STATUS
5. StoreBuilder delegates Design+Copy then codegen+build
6. PersonalBrain memories namespace store_builder when available
7. Fallback without LLM produces Appendix H–valid trees only

### Acceptance tests
- Registry includes four agents
- STORE_BUILD creates project+revision in test doubles
- proposePublish does not deploy
- Fallback tree passes compiler allowlist

### Out of scope
- Frontend, real Lighthouse CI, CDN

### Handoff
Intent strings for P07 parser.
```

---

### P07 — NL intents + PUBLISH_STOREFRONT approval (LOCKED deploy stub)

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P07 — Command intents + ApprovalExecutor publish

### Elon Algorithm
1. Question: Mag publish ooit de ApprovalExecutor omzeilen? NO.
2. Delete: No second publish path in websiteRouter.

### Doel
Wire STORE_* intents; ApprovalExecutor handler calls DeployPort.

### Reads
- storefront-api-contracts.md (§4, §5)
- shared/approval/* + existing handlers
- admin-command-bar NL execute path
- frontend routes.ts INTENT_ROUTES

### Deliverables
1. Parser/intents: STORE_BUILD, STORE_ITERATE, STORE_PUBLISH, STORE_STATUS
2. `shared/approval/handlers/storefrontPublishApprovalHandler.ts`
   - canHandle('storefront-builder', 'PUBLISH_STOREFRONT')
3. On execute: DeployPort.deploy(projectId, revisionId)
4. **LOCKED deploy stub:** StubDeployAdapter ALWAYS sets SiteProject.status=`live` and liveRevisionId (local/CI), regardless of STOREFRONT_DEPLOY_ENABLED. When STOREFRONT_DEPLOY_ENABLED=true, additionally emit audit/business log `deploy.provider=stub` only — **no external CDN/provider in Birth**.
5. ProposePublishUseCase / publish endpoint: if latest qaScore < **0.80**, return 422 `QA_BELOW_THRESHOLD` (required gate)
6. Audit log on success/fail
7. Frontend INTENT_ROUTES + sidecar boost for `/website`
8. Tests: approve→live; reject→not live; wrong tenant fails; qaScore 0.79 blocks propose publish

### Acceptance tests
- In-process approve executes stub deploy → live
- Command routes to store_builder / use-case
- qaScore < 0.80 → QA_BELOW_THRESHOLD
- validate-dod still passes

### Out of scope
- Real Cloudflare/Vercel; website UI (P10)

### Handoff
DeployPort final signature for P08.
```

---

### P08 — Preview host + local DeployPort (port 4177)

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P08 — Preview host + local deploy

### Elon Algorithm
1. Question: Wat is de simpelste preview URL die P09/P10 kunnen iframen?
2. Delete: No second preview token scheme — use P04 helpers only.

### Doel
BuildJob.previewUrl working; local deploy pointer; port **4177**.

### Reads
- storefront-architecture.md (§6.3)
- P04 token helpers
- LocalFsArtifactStoreAdapter

### Deliverables
1. LocalPreviewHostAdapter: previewUrl = `http://localhost:4177/preview/:revisionId?token=...` (token TTL **15 minutes**)
2. StartBuildUseCase: compile → QA stub (happy-path qaScore ≥ 0.80) → preview host → BuildJob succeeded
3. StubDeployAdapter: live pointer under artifacts + DB fields (P07 contract)
4. Env: STOREFRONT_PREVIEW_PORT=4177, STOREFRONT_PREVIEW_HMAC_SECRET required outside test
5. Tests: build success; expired token rejected; qaScore persisted on BuildJob/revision

### Out of scope
- Next.js package (P09), production CDN

### Handoff
Exact preview URL pattern for storefront-runtime + admin iframe.
```

---

### P09 — storefront-runtime Next.js package

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P09 — aether-core/storefront-runtime

### Elon Algorithm
1. Question: Smallest host that renders Appendix H trees?
2. Delete: No merchant arbitrary code execution.

### Doel
Next.js App Router host + block registry + public API SDK.

### Reads
- storefront-builder.md (§4.3)
- storefront-architecture.md (§6)
- storefront-api-contracts.md (§2)
- Appendix H

### Deliverables
1. aether-core/storefront-runtime/ package
2. Block registry for ALL allowlisted blocks (simple, a11y, CSS variables from tokens)
3. PageTree renderer; unknown block → safe fallback
4. Routes: `app/[tenantSlug]/[[...path]]` live; `app/preview/[revisionId]` preview on port 4177
5. SDK → NEXT_PUBLIC_AETHER_API_BASE
6. README dev instructions
7. Component/fixture test: Appendix H home tree renders
8. `npm run build` succeeds

### Acceptance tests
- Hero + ProductGrid from fixture
- Unknown block safe
- Production build green

### Out of scope
- Admin UI; CheckoutShell must render as **static non-interactive shell** until P13 (no cart API calls in Birth)

### Handoff
Iframe URL for P10 preview page.
```

---

### P10 — Admin UI `/website/*` + `/pages`

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P10 — Merchant Website admin UI (Birth UI)

### Elon Algorithm
1. Question: Minimum UI for Birth loop? Hub, brief, preview, pages, publish + /pages mirror.
2. Delete: No drag-drop editor.

### Doel
Website surfaces per merchant-dashboard-ia.md §4.10–4.14 **including `/pages`**.

### Reads
- merchant-dashboard-ia.md (§2 nav, §4.10–4.14)
- routes.ts, Products.tsx patterns
- frontend ARCHITECTURE.md

### Deliverables
1. Routes + module website:
   - /website
   - /website/brief
   - /website/preview
   - /website/pages
   - /website/publish
   - **/pages** (CMS mirror — same data/hooks as /website/pages; commerce/Website nav entry)
2. AsyncBoundary + truth badge (planned/partial — never fake live)
3. Hub empty: “Wat wil je verkopen?” → create project
4. Preview iframe → P08 URL + iterate chip → revisions API
5. Publish → create approval + link /approvals
6. i18n nav keys; Website nav group complete
7. Smoke test mock API empty→create

### Acceptance tests
- All routes resolve including /pages
- No hardcoded live marketing claims
- Frontend lint/tests green for touched files

### Out of scope
- Product/order detail (P11), cart

### Handoff
Shared hooks path; confirm Birth UI ready for BIRTH GATE.
```

---

### BIRTH GATE — mandatory before P11

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: BIRTH GATE — vertical slice proof

### Elon Algorithm
1. Question: Is Birth closed loop proven with tests, or are we lying?
2. Delete: Do not start P11. Fix Birth only.

### Doel
PASS the Birth loop end-to-end. On FAIL: fix regressions in P01–P10 scope only. **Do not implement P11+.**

### Reads
- Playbook §1 Birth metrics
- Appendix I checklist
- progress-overview-2026-07.md

### Deliverables
1. Automated API e2e at **exact path**:
   `aether-core/backend/src/modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts`
   - Enable FEATURE_STOREFRONT_BUILDER + FEATURE_STOREFRONT_PUBLIC_API in test
   - POST project from brief → build succeeds → previewUrl on :4177
   - qaScore ≥ 0.80 path can propose publish; < 0.80 blocked
   - POST publish → approval pending → executeApprovedAction → live
   - GET /api/storefront/:slug/pages?path=/ returns allowlisted tree
   - Assert preview token TTL behavior (expired rejected) and rate-limit constant documented as 60/min/IP
2. Flags default remain false in .env.example
3. Manual checklist Appendix I filled in handoff (all boxes)
4. If any box fails: follow Appendix J; fix + re-run until PASS — **no P11**
5. Truth status: may move storefront-builder to `partial` ONLY if e2e+UI evidence exists; otherwise keep `planned` and document blocker
6. Output: `BIRTH_GATE=PASS` or `BIRTH_GATE=FAIL` as last line of report

### Acceptance tests
- storefront-birth.e2e.test.ts green
- Appendix I all checked
- No P11 files added in this chat

### Out of scope
- Customers, inventory UI, cart, promotions

### Handoff
Only if PASS: “Authorized to start P11.”
```

---

### P11 — Commerce dashboard APIs + UI

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P11 — Products/Orders/Customers/Inventory depth

### Prerequisite
BIRTH_GATE=PASS from previous chat. If unknown: run BIRTH GATE first.

### Elon Algorithm
1. Question: Which CRUD surfaces unblock merchants fastest after Birth?
2. Delete: No second admin framework.

### Doel
APIs + UI per contracts §3.1–3.4 and IA §4.1–4.7.

### Reads
- storefront-api-contracts.md (§3.1–3.4)
- merchant-dashboard-ia.md (§3–5)
- product-catalog, order-management, inventory-pricing, AdminDataPort

### Deliverables
BACKEND: product get/patch/delete + variants + media via ProductMedia; order detail enrich + ship + refund(approval); customers list/detail/orders; inventory list/low-stock/adjust + tests  
FRONTEND: /products/new, /products/:id tabs; /orders/:id; /customers, /customers/:id; /inventory; Commerce nav; sidecar boosts

### Acceptance tests
- Tenant isolation
- Refund→approval when required
- UI renders with fixtures

### Out of scope
- P12/P13; do not regress Birth e2e

### Handoff
Gaps for promotions/payments.
```

---

### P12 — Promotions + payments UI shells

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P12 — Promotions + Payments dashboard

### Elon Algorithm
1. Question: Real endpoints or honest empty? Prefer real; never fake live billing.
2. Delete: Demo overlays that claim production payouts.

### Doel
/promotions + /payments shells wired to real partial backends.

### Reads
- merchant-dashboard-ia.md (§4.8–4.9)
- payment-fulfillment module
- Promotion model from P01 + PromotionAgent tools

### Deliverables
1. GET/POST /api/promotions minimal; payments summary/payouts wrap existing
2. Pages /promotions, /payments + Commerce nav
3. Honest truth badges; tests

### Acceptance tests
- Pages load; no false live billing claims

### Out of scope
- Production Adyen

### Handoff
Payment client secret notes for P13.
```

---

### P13 — Cart + checkout + CheckoutShell

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P13 — Cart/Checkout for live shop

### Elon Algorithm
1. Question: Minimum path catalog→cart→checkout sandbox?
2. Delete: Multi-currency / subscriptions.

### Doel
Public cart/checkout APIs + CheckoutShell wiring; stripe mock/sandbox.

### Reads
- storefront-api-contracts.md (§2.5–2.6)
- payment-fulfillment stripe test patterns
- storefront-runtime CheckoutShell

### Deliverables
1. Use Cart/CartItem from P01
2. Public cart + checkout endpoints; stock checks; idempotency key
3. Runtime CartDrawer + CheckoutShell wired
4. API e2e: catalog→cart→checkout
5. storefront-runtime build green

### Acceptance tests
- Empty cart 422; insufficient stock 422; correct tenant order

### Out of scope
- Subscriptions

### Handoff
E2E script for P14.
```

---

### P14 — E2E + truth matrix graduation

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P14 — End-to-end proof + honest status updates

### Elon Algorithm
1. Question: What status is earned — planned, partial, or implemented?
2. Delete: Marketing fantasy (“60s live”) from runtime docs.

### Doel
Prove Birth + commerce paths; update truth ONLY with evidence. Birth Gate evidence must remain green.

### Reads
- truth-matrix.md, feature-status.json, release-gates.md
- validate-dod.js, CONTRIBUTING.md
- Appendix I

### Deliverables
1. CI-ready e2e:
   - Birth loop **required** at `storefront-birth.e2e.test.ts` (must stay green)
   - Checkout e2e **required** if P13 is done; if P13 not done, report exact line `CHECKOUT_E2E=SKIPPED_PRE_P13` (no silent skip)
2. feature-status updates:
   - storefront-builder → partial (or implemented ONLY if full e2e+UI+runtime proven)
   - merchant-dashboard-commerce-ui → partial if P11 evidenced
   - add/update storefront-public-api key if used
3. truth-matrix rows with test path evidence (include Birth e2e path)
4. progress-overview + current-status brief update
5. validate-dod PASS

### Acceptance tests
- validate-dod PASS; Birth e2e PASS; checkout e2e PASS or `CHECKOUT_E2E=SKIPPED_PRE_P13`; no hallucinated claims

### Out of scope
- New features

### Handoff
Residual risks for P15 + checkout e2e status line.
```

---

### P15 — Hardening (Elon-grade delete pass)

```text
[GLOBAL SYSTEM PROMPT — plak hierboven]

## Pn: P15 — Security, RBAC, observability, delete-pass

### Elon Algorithm
1. Question: What can we delete that still leaves Birth+commerce green?
2. Delete: Dead code, duplicate flags, unused abstractions — then harden what remains.

### Doel
Production-minded hardening + create security checklist.

### Reads
- anti-patterns.md
- observability-runbook.md
- Birth modules + public API + approval handler

### Deliverables (ALL)
1. Security: HMAC secret required non-test; slug validation; no artifact path traversal; public rate limits; no PII in logs
2. RBAC audit tests
3. Events: website.revision.created, website.build.finished, website.publish.approved, website.deploy.succeeded|failed
4. Extra codegen fuzz tests
5. Frontend a11y on /website + product/order detail
6. Runtime perf note for ProductGrid
7. Flags default safe
8. README local full-stack Birth demo
9. Create `aether-core/docs/storefront-security-checklist.md`
10. Final validate-dod + backend tests + frontend verify + storefront-runtime build
11. evolution-log: Storefront Birth runtime honest status

### Acceptance tests
- Suites green; security checklist exists; Birth e2e still PASS

### Out of scope
- Multi-region; hive-mind storefront distillation

### Handoff
Vertical slice DONE + backlog as planned-only items.
```

---

## 4. Appendix

### A. Master checklist

| ID | Title | Done |
|----|-------|------|
| GLOBAL | System prompt each chat | ☐ |
| P00 | Bootstrap & truth freeze | ☐ |
| P01 | Prisma Site* + commerce (locked) | ☐ |
| P02 | storefront-builder skeleton | ☐ |
| P03 | Admin `/api/website/*` + OpenAPI stub | ☐ |
| P04 | Public storefront read API | ☑ |
| P05 | Codegen allowlist (no overrides) | ☑ |
| P06 | Agents | ☑ |
| P07 | Intents + publish approval | ☑ |
| P08 | Preview :4177 + local deploy | ☑ |
| P09 | storefront-runtime | ☑ |
| P10 | `/website/*` + `/pages` | ☑ |
| BIRTH GATE | Vertical slice PASS | ☑ |
| P11 | Commerce dashboard depth | ☑ |
| P12 | Promotions + payments UI | ☑ |
| P13 | Cart + checkout | ☑ |
| P14 | E2E + truth graduation | ☑ |
| P15 | Hardening | ☑ |

### B. Target file tree (end state)

```
aether-core/
  backend/
    prisma/migrations/*_storefront_builder/
    openapi/website.yaml
    src/modules/storefront-builder/
    src/ai/intelligence/multi-agent/agents/
      StoreBuilderAgent.ts DesignAgent.ts CopySeoAgent.ts StoreQAAgent.ts
    src/shared/approval/handlers/storefrontPublishApprovalHandler.ts
  storefront-runtime/
  frontend/src/pages/
    website/...
    PagesCms.tsx          # /pages
    ProductDetailPage.tsx OrderDetailPage.tsx
    Customers.tsx CustomerDetailPage.tsx Inventory.tsx
    Promotions.tsx Payments.tsx
  docs/
    GROK_IMPLEMENTATION_PLAYBOOK_STOREFRONT_DASHBOARD.md
    progress-overview-2026-07.md
    storefront-security-checklist.md
```

### C. Feature flags (LOCKED)

| Mechanism | Value |
|-----------|--------|
| Admin gate | `featureGate('storefront-builder')` |
| Admin env | `FEATURE_STOREFRONT_BUILDER=true` |
| Admin alias | `STOREFRONT_BUILDER_ENABLED=true` → **must set same underlying flag** (implement once in isFeatureEnabled) |
| Public gate | `featureGate('storefront-public-api')` |
| Public env | `FEATURE_STOREFRONT_PUBLIC_API=true` |
| Deploy | `STOREFRONT_DEPLOY_ENABLED` (false → local live pointer only) |
| Artifacts | `STOREFRONT_ARTIFACTS_DIR=tmp/storefront-artifacts` |
| Preview | `STOREFRONT_PREVIEW_PORT=4177` |
| Preview HMAC | `STOREFRONT_PREVIEW_HMAC_SECRET` required non-test |
| Preview token TTL | **15 minutes** (code constant) |
| Public rate limit | **60 req/min/IP** |
| QA publish | **qaScore ≥ 0.80** required to propose publish |

Defaults: builder/public **false**.

### D. Chat split rules

Split as `Pn-a` / `Pn-b` only (e.g. P11-a API → P11-b UI). Never skip Birth Gate. Never start P10 before P08 URL exists.

### E. Commit style (when human asks)

```
feat(storefront): <Pn summary>

Why: <merchant / Birth outcome>
```

### F. Fully implemented (final) vs Birth

**Birth complete (Gate PASS):** brief→preview→approve→public page.  
**Fully implemented:** Birth + P11 detail CRUD + P13 checkout + P14 evidence + P15 harden.

### G. Locked decisions (LAW)

| Topic | Decision |
|-------|----------|
| Product media | `MediaAsset` + `ProductMedia` — **no** Product.images Json |
| P01 tables | Site* + Category + Media* + Cart/CartItem + Promotion + Shipment + Refund — **all required** |
| P01 seed | 1 tenant + 1 product **with** ≥1 ProductMedia (placeholder URL ok) |
| TSX overrides | **Rejected in v1** — treeJson + tokens + copy only |
| Admin flag | `storefront-builder` + `FEATURE_STOREFRONT_BUILDER`; alias `STOREFRONT_BUILDER_ENABLED` |
| Public flag | `storefront-public-api` + `FEATURE_STOREFRONT_PUBLIC_API` |
| Deploy | Stub always sets `live` + `liveRevisionId`; `STOREFRONT_DEPLOY_ENABLED=true` → log `deploy.provider=stub` only (no CDN) |
| Preview port | **4177** |
| Preview token TTL | **15 minutes** |
| Public rate limit | **60 req/min/IP** |
| QA publish gate | **qaScore < 0.80** → `QA_BELOW_THRESHOLD` (required) |
| Birth e2e path | `aether-core/backend/src/modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts` |
| Birth Gate | After P10, before P11; FAIL → Appendix J |
| P00 handoff | Chat report only — **no** `BIRTH_READY.md` file |
| P10 routes | Include `/pages` mirror |
| Fixtures | Appendix H normative (all pages + copy) |
| Soft options | **Forbidden** — if unspecified, stop and ask human |

### H. Canonical SitePlan + page tree fixtures

Agents and compiler MUST accept/emit this shape (block types subset of allowlist).

**plan.json**

```json
{
  "version": 1,
  "localeDefault": "nl-NL",
  "locales": ["nl-NL"],
  "brand": {
    "name": "Atelier Noord",
    "primaryColor": "#3D2B1F",
    "accentColor": "#C4A484"
  },
  "pages": [
    { "path": "/", "title": "Home", "template": "home" },
    { "path": "/products", "title": "Collectie", "template": "collection" },
    { "path": "/products/:slug", "title": "Product", "template": "pdp" },
    { "path": "/about", "title": "Over ons", "template": "about" },
    { "path": "/contact", "title": "Contact", "template": "contact" },
    { "path": "/legal", "title": "Legal", "template": "legal" }
  ]
}
```

**pages/index.tree.json** (home)

```json
{
  "type": "Page",
  "children": [
    {
      "type": "Nav",
      "props": {
        "links": [
          { "label": "Collectie", "href": "/products" },
          { "label": "Over ons", "href": "/about" }
        ]
      }
    },
    {
      "type": "Hero",
      "props": {
        "headline": "Handmade keramiek",
        "subheadline": "Rustiek. Eerlijk. Lokaal.",
        "ctaLabel": "Shop collectie",
        "ctaHref": "/products"
      }
    },
    {
      "type": "ProductGrid",
      "props": { "source": "featured", "limit": 8 }
    },
    {
      "type": "FAQ",
      "props": {
        "items": [
          { "q": "Verzendtijd?", "a": "2–4 werkdagen in NL." }
        ]
      }
    },
    {
      "type": "Footer",
      "props": { "text": "© Atelier Noord" }
    }
  ]
}
```

**pages/products.tree.json** (collection)

```json
{
  "type": "Page",
  "children": [
    {
      "type": "Nav",
      "props": {
        "links": [
          { "label": "Home", "href": "/" },
          { "label": "Collectie", "href": "/products" }
        ]
      }
    },
    {
      "type": "Hero",
      "props": {
        "headline": "Collectie",
        "subheadline": "Alle stukken uit het atelier.",
        "ctaLabel": "Terug",
        "ctaHref": "/"
      }
    },
    {
      "type": "CollectionFilter",
      "props": { "facets": ["materiaal", "kleur"] }
    },
    {
      "type": "ProductGrid",
      "props": { "source": "all", "limit": 24 }
    },
    {
      "type": "Footer",
      "props": { "text": "© Atelier Noord" }
    }
  ]
}
```

**pages/products.[slug].tree.json** (PDP template)

```json
{
  "type": "Page",
  "children": [
    {
      "type": "Nav",
      "props": {
        "links": [
          { "label": "Collectie", "href": "/products" }
        ]
      }
    },
    {
      "type": "ProductDetail",
      "props": { "showAddToCart": true }
    },
    {
      "type": "TrustBadges",
      "props": { "items": ["Handgemaakt", "NL verzending"] }
    },
    {
      "type": "Footer",
      "props": { "text": "© Atelier Noord" }
    }
  ]
}
```

**pages/about.tree.json**

```json
{
  "type": "Page",
  "children": [
    {
      "type": "Nav",
      "props": {
        "links": [
          { "label": "Home", "href": "/" },
          { "label": "Collectie", "href": "/products" }
        ]
      }
    },
    {
      "type": "RichText",
      "props": {
        "copyKey": "about.body"
      }
    },
    {
      "type": "ImageBand",
      "props": { "alt": "Atelier", "srcKey": "about.hero" }
    },
    {
      "type": "Footer",
      "props": { "text": "© Atelier Noord" }
    }
  ]
}
```

**pages/contact.tree.json**

```json
{
  "type": "Page",
  "children": [
    {
      "type": "Nav",
      "props": {
        "links": [
          { "label": "Home", "href": "/" }
        ]
      }
    },
    {
      "type": "Hero",
      "props": {
        "headline": "Contact",
        "subheadline": "Vragen over bestellingen of custom werk.",
        "ctaLabel": "Mail ons",
        "ctaHref": "mailto:hallo@atelier-noord.example"
      }
    },
    {
      "type": "ContactForm",
      "props": { "fields": ["name", "email", "message"] }
    },
    {
      "type": "Footer",
      "props": { "text": "© Atelier Noord" }
    }
  ]
}
```

**pages/legal.tree.json**

```json
{
  "type": "Page",
  "children": [
    {
      "type": "Nav",
      "props": {
        "links": [
          { "label": "Home", "href": "/" }
        ]
      }
    },
    {
      "type": "LegalText",
      "props": { "copyKey": "legal.body" }
    },
    {
      "type": "Footer",
      "props": { "text": "© Atelier Noord" }
    }
  ]
}
```

**tokens.json** (minimal)

```json
{
  "color": { "primary": "#3D2B1F", "accent": "#C4A484", "bg": "#FAF7F2", "text": "#1A1A1A" },
  "font": { "display": "Georgia, serif", "body": "system-ui, sans-serif" },
  "radius": { "md": "0.5rem" }
}
```

**copy/nl.json**

```json
{
  "about.body": "Atelier Noord maakt handmade keramiek in kleine series. Elke kom wordt met de hand gedraaid.",
  "legal.body": "Algemene voorwaarden, privacy en retourbeleid. Placeholder Birth copy — vervang via STORE_ITERATE.",
  "home.hero.headline": "Handmade keramiek",
  "product.cta": "In winkelwagen"
}
```

### I. Birth Gate checklist

Copy into BIRTH GATE handoff; all must be `[x]`:

- [ ] `FEATURE_STOREFRONT_BUILDER` / public flags default **false** in .env.example
- [ ] Create project from brief → revision exists
- [ ] BuildJob `succeeded` + `previewUrl` on port **4177**
- [ ] Preview token TTL **15 minutes** (expired rejected in test)
- [ ] Public rate limit **60 req/min/IP** documented + tested
- [ ] Compiler rejects unknown blocks + rejects overrides
- [ ] Propose publish with qaScore < **0.80** → `QA_BELOW_THRESHOLD`
- [ ] Publish creates **pending** approval (not auto-live)
- [ ] Approve execute → `status=live` + `liveRevisionId` set
- [ ] `GET /api/storefront/:slug/pages?path=/` returns allowlisted tree
- [ ] Cross-tenant access denied / 404
- [ ] Admin `/website` + `/pages` routes load without fake “live” badges
- [ ] E2E file exists and green: `.../storefront-birth.e2e.test.ts`
- [ ] No P11+ work started before this PASS
- [ ] On any FAIL: Appendix J followed
- [ ] Final line of report: `BIRTH_GATE=PASS`

### J. Failure & Rollback (Birth)

Use when BIRTH GATE fails or production-like mishap during Birth. **Never start P11 while recovering.**

| Failure | Immediate action | Rollback / fix |
|---------|------------------|----------------|
| `validate-dod` / truth drift | Stop feature work | Fix truth docs only; re-run validate-dod |
| Codegen `CODEGEN_REJECTED` | Do not publish | Fix trees to Appendix H; re-run build |
| BuildJob `failed` | Keep project `draft`/`preview` | Inspect logs; fix compiler/QA stub; new build |
| Preview HMAC missing (non-test) | Do not expose preview | Set `STOREFRONT_PREVIEW_HMAC_SECRET`; restart |
| Preview token expired | Expected after 15m | Re-issue via `GET /api/website/preview/:revisionId` |
| Rate limit 429 storm in tests | Flaky test | Assert 60/min constant; reset in-memory store between tests |
| Propose publish qaScore < 0.80 | 422 expected | Improve QA / rebuild until ≥ 0.80 |
| Approval pending stuck | Do not manual DB live | Resolve via Approvals API reject/approve only |
| Approve executed but public page 404 | Partial live | Verify `liveRevisionId`, public flag on, slug match; rebuild+republish if artifacts missing |
| Wrong tenant data leak in test | **STOP** — security | Fix repository filters; add regression test; Gate = FAIL until green |
| Accidental P11 files during Gate | Delete those changes | Revert P11 scope; Gate again |
| Need soft reset of site | Prefer new revision | Do not delete live revision until new revision approved; or set status `draft` + clear liveRevisionId via explicit operator admin use-case only (add only if missing — keep audited) |

**Gate FAIL report template:**

```text
BIRTH_GATE=FAIL
failed_checks: <list Appendix I boxes>
root_cause: <one sentence>
fix_plan: <P0x files only>
next: re-run BIRTH GATE — do not start P11
```

---

*Playbook version: 2.1 — Birth Perfect — 2026-07-27 — for Grok 4.5 in Cursor*
