# Storefront Builder Department

**Status:** Partial (P01–P07 runtime: schema, APIs, codegen, specialists, STORE_* intents, PUBLISH_STOREFRONT ApprovalExecutor + stub deploy — preview host / real edge pending)  
**Authority:** Superseded by `aether-core/docs/runtime-charter.md` for deployment claims  
**Related:** [`storefront-architecture.md`](../../aether-core/docs/storefront-architecture.md) · [`storefront-api-contracts.md`](../../aether-core/docs/storefront-api-contracts.md) · [`merchant-dashboard-ia.md`](../../aether-core/docs/merchant-dashboard-ia.md)

---

## 1. Purpose

The Storefront Builder department enables AETHER to **autonomously produce and iterate a merchant’s customer-facing website** from a natural-language brief, catalog data, and brand preferences — then preview, QA, and publish under human approval.

It is not a bolt-on page builder for engineers. It is a **bounded multi-agent department** that generates revisioned storefront artifacts and deploys them through the same approval-execute loop used by Mail and Supplier agents.

---

## 2. Product promise (design target)

1. Merchant states what they sell and how the brand should feel.
2. Agents produce a **SiteRevision** (plan + page trees + tokens + copy + optional allowlisted TSX overrides).
3. Sandbox **build + QA** produce a preview URL.
4. Merchant approves **publish** (high-risk).
5. Live storefront serves the approved revision via `storefront-runtime` + public Storefront APIs.

**Honesty rule:** Do not claim “60-second live store” until E2E preview + publish is proven in CI and `feature-status.json` is updated from `planned`.

---

## 3. Principles (non-negotiable)

| Principle | Application |
|-----------|-------------|
| PersonalBrain First | Briefs, brand memory, and iteration history stay tenant-isolated |
| Local AI First | Design/copy generation prefers Ollama/`LlmInferencePort`; cloud only with merchant opt-in |
| Autonomy with control | Preview/build may auto-run; **publish always requires approval** |
| Merchant Success First | Generated sites must load fast, be accessible, and sell — QA gates enforce this |
| Intellectual honesty | Allowlisted codegen only; no silent “full freeform codegen” claim |
| Bounded contexts | Storefront builder ≠ ops agents ≠ admin UI; clear ports between them |

---

## 4. Codegen security model (allowlisted AST/DSL)

### 4.1 What agents may generate

- `tokens.css` / design token JSON (colors, type scale, spacing, radius)
- `pages/*.tree.json` — component trees referencing **allowlisted block types**
- Copy and SEO JSON (titles, descriptions, structured-data payloads)
- Optional `overrides/*.tsx` **only if** they pass AST allowlist (no `eval`, no dynamic `require`, no Node builtins, no network except approved SDK imports)

### 4.2 What agents must never generate

- Arbitrary server routes, Prisma clients, or shell scripts
- Unsandboxed `process`, `fs`, `child_process`, raw SQL
- Third-party script tags without an allowlisted integration block
- Cross-tenant data access

### 4.3 Allowlisted blocks (initial set)

`Hero`, `LogoBar`, `ProductGrid`, `ProductDetail`, `RichText`, `ImageBand`, `FAQ`, `Testimonials`, `NewsletterSignup`, `Footer`, `Nav`, `CartDrawer`, `CheckoutShell`, `LegalText`, `ContactForm`, `CollectionFilter`, `TrustBadges`

New blocks require a design review + runtime registration in `storefront-runtime` before agents may emit them.

### 4.4 Compilation path

```
Brief + Catalog context
  → SitePlan (JSON)
  → Page trees + tokens + copy
  → Codegen compiler → artifacts in SiteRevision
  → StoreQAAgent (typecheck, a11y, Lighthouse budget, link check)
  → Preview host
  → Approval → DeployPort → live
```

---

## 5. Agents

Follow `operating-system/skills/merchant-agent-patterns.md` (classify → propose/execute → approval gate → audit).

| Agent key | Role | Default risk |
|-----------|------|--------------|
| `store_builder` | Orchestrates brief → plan → codegen → build → propose publish | High on publish |
| `design` | Layout, tokens, page tree structure | Medium |
| `copy_seo` | Microcopy, PDP text, meta, hreflang, JSON-LD | Medium |
| `store_qa` | Build checks, Lighthouse, a11y, revision diff | Low (read/report) |

### 5.1 Tools (conceptual)

**StoreBuilderAgent**

- `createSiteProject` (execute, medium)
- `createRevisionFromBrief` (execute, medium)
- `runBuild` (execute, low–medium)
- `proposePublish` (propose only → approval)

**DesignAgent**

- `proposeLayout`, `proposeTokens`, `proposePageTree`

**CopySeoAgent**

- `proposeCopy`, `proposeMeta`, `localize`

**StoreQAAgent**

- `runBuildChecks`, `runLighthouse`, `diffRevisions`

### 5.2 Command Center intents

| Intent | Behavior | Route |
|--------|----------|-------|
| `STORE_BUILD` | New project/revision from brief | `/website` |
| `STORE_ITERATE` | Revision from natural-language delta | `/website/preview` |
| `STORE_PUBLISH` | Propose publish | `/website/publish` or `/approvals` |
| `STORE_STATUS` | Project/revision/QA summary | `/website` |

---

## 6. Department boundaries

```
┌─────────────────────────────────────────────────┐
│ Storefront Builder (this department)            │
│  agents + storefront-builder module + artifacts │
└───────────────────────┬─────────────────────────┘
                        │ DeployPort / PreviewPort
┌───────────────────────▼─────────────────────────┐
│ storefront-runtime (Next.js host + block SDK)   │
└───────────────────────┬─────────────────────────┘
                        │ public Storefront API
┌───────────────────────▼─────────────────────────┐
│ AETHER Core (catalog, orders, payments, …)      │
└─────────────────────────────────────────────────┘
```

- **Does not own** product/order truth — reads Core APIs.
- **Does not replace** admin Command Center — exposes `/website/*` and NL intents.
- **Does not bypass** Approvals for live publish.

---

## 7. PersonalBrain integration

Store brief, accepted brand tokens, rejected patterns (“never use neon”), and publish outcomes into PersonalBrain episodic/semantic memory so iterations improve per tenant. No cross-tenant storefront artifacts in GlobalBrain without explicit opt-in distillation (same hive-mind rules as other domains).

---

## 8. Implementation order (when building)

1. Prisma `Site*` models + admin website APIs  
2. Public catalog/page read APIs  
3. Agents (propose-only) + codegen compiler + preview build  
4. Admin `/website/*` UI  
5. Publish approval action + `DeployPort`  
6. Cart/checkout public APIs (dependency for true “live shop”)

---

## 9. Anti-patterns

- Claiming MedusaJS or freeform LangGraph store builder as runtime
- Auto-publishing without approval
- Letting agents invent new block types at runtime
- Building a second commerce engine inside the storefront package
- Hardcoding “live” badges in UI before truth-matrix evidence exists
