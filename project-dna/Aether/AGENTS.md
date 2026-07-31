# AETHER — AGENTS.md

**Canonical path:** `project-dna/Aether/AGENTS.md`  
**Audience:** All development agents (Cursor, Grok, CI helpers, humans acting as agents)

This file is the central operating instruction for AETHER. It consolidates existing DNA; it does not invent new principles.

---

## North Star

AETHER is a zelf-lerend, zelf-evoluerend AI e-commerce organisme — an intelligent merchant operating system that lets merchants run significant parts of their business with minimal daily oversight and maximum control over their data.

Success means: genuine merchant autonomy, calm/fast/intentional UX, reliable AI for routine work, minimized complexity, and long-term merchant success over short-term feature count.

---

## Mandatory reading order

1. This file (`AGENTS.md`)
2. [`principles.md`](./principles.md) — non-negotiable principles
3. [`anti-patterns.md`](./anti-patterns.md) — what we actively avoid
4. [`architecture.md`](./architecture.md) — layer model
5. **Runtime truth:** `aether-core/docs/runtime-charter.md` + truth-matrix + feature-status.json
6. Relevant skill under [`operating-system/skills/`](./operating-system/skills/)
7. Living architecture audit tracker: [`audit-checklist.md`](./audit-checklist.md)

`.cursor/skills/` are working copies of the canonical skills. Keep them aligned.

---

## Authority hierarchy

1. Runtime charter + truth-matrix + feature-status.json — **implementation status**
2. Release gates — what must pass before pilot
3. Roadmap alignment — planning only
4. `project-dna/Aether/` — vision and principles (not implementation status)
5. `Project/`, `fase2/`, `admin-luxury/`, `backend-command/` — **archived**; never deployment truth

**Runtime wins** over ambition docs.

**Deployment source of truth:** `aether-core/` only.

---

## Technical architecture (summary)

### Layers

1. **AI Brain / Orchestration** — in-process orchestrator + task map (no LangGraph in runtime); PersonalBrain (per tenant); GlobalBrain (anonymized); KnowledgeTransfer as the only bridge
2. **Merchant Logic** — DDD modules: `api → application → domain ← infrastructure`
3. **Data** — PostgreSQL via Prisma; tenant context mandatory in repositories
4. **Presentation** — merchant admin (React) + storefront-runtime

### Module boundaries (enforced)

- Application must not import prisma or infrastructure directly (architecture tests; shrink allowlists, do not grow them)
- Controllers must not import prisma
- No `tenant_default` in persistence
- Intelligence must not tightly couple to specific commerce infrastructure; use ports

### Quality bar for code

- Clean, efficient, well-typed, intentional
- No dead code
- No hallucinations (fake implementations that claim success)
- No God files (single responsibility; prefer &lt; ~300–400 lines of real logic; split by extraction)

---

## Kernprincipes (shortcut)

Full text in [`principles.md`](./principles.md):

1. PersonalBrain First  
2. Local AI First  
3. Privacy & Data Ownership  
4. Modulaire Architectuur  
5. Autonomie met Controle  
6. Merchant Success First  
7. Intellectual Honesty  

---

## Workflow (token efficiency)

Classify every task out loud: **Simple | Medium | Complex | High-Impact**.

| Class | Mode |
|-------|------|
| Simple | Direct |
| Medium | Plan Mode |
| Complex / High-Impact | Plan Mode + todos; High-Impact needs human review for core brain / privacy / autonomy |

Rules:

- Prefer Plan Mode for architectural or cross-cutting work
- Use todos for 3+ steps or High-Impact work
- **Nieuwe chat = nieuwe bounded context**
- After each sub-task: typecheck + relevant tests
- Prefer extraction/splitting over rewrites; keep the tree compilable after every step
- Never introduce features under the guise of refactor
- Never change observable behavior or domain rules unless the task explicitly requires it
- Update [`current-status.md`](./current-status.md) at the end of significant sessions

Canonical skill: [`operating-system/skills/token-efficiency.md`](./operating-system/skills/token-efficiency.md)

---

## Skills map

| Skill | Use when |
|-------|----------|
| `token-efficiency` | Every development task (workflow) |
| `aether-principles-guard` | Architecture / privacy / Local AI / merchant value |
| `brain-architecture` | PersonalBrain, GlobalBrain, KnowledgeTransfer, memory |
| `multi-agent-orchestration` | Agents, handoffs, HITL, tool calling |
| `local-ai-patterns` | Ollama / local inference paths |
| `merchant-agent-patterns` | Merchant-facing autonomous agents |
| `testing-strategy` | Tests, evidence, release honesty |

---

## Claim policy

- No feature marked `implemented` without code + tests + truth-matrix / feature-status row
- Partial / experimental labels are honest
- Stubs must be named stubs (or gated); never return success while discarding work
- Archived docs that claim MedusaJS, air-gapped mesh, ZK-SNARK commerce, etc. are rejected by the runtime charter

---

## Current technical reality (honest)

See [`current-status.md`](./current-status.md) for live component status. In short: Custom AETHER Core is the runtime; PersonalBrain / GlobalBrain / KnowledgeTransfer / storefront builder remain partial where marked; Local AI is opt-in with fallbacks.

---

## Anti-patterns (shortcut)

Do not: add complexity without merchant value; treat AI as a bolt-on helper; tightly couple AI to business infra; over-engineer; ship busy UI; claim unfinished work as done.

Full list: [`anti-patterns.md`](./anti-patterns.md)
