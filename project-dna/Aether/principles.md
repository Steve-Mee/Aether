# AETHER Principles

**Canonical path:** `project-dna/Aether/principles.md`  
**Companion:** [`anti-patterns.md`](./anti-patterns.md) · [`AGENTS.md`](./AGENTS.md)

These principles are non-negotiable. They govern product, architecture, and agent behavior. Implementation status is never claimed from this document — see `aether-core/docs/runtime-charter.md`.

---

## Kernprincipes

1. **PersonalBrain First** — Iedere merchant heeft een strikt geïsoleerd, privé brein. Vector memory, LoRA adapters, and agent state are tenant-isolated.

2. **Local AI First** — Gevoelige operaties draaien bij voorkeur lokaal (Ollama/vLLM). Cloud LLM calls require explicit opt-in and must not become the silent default for merchant data.

3. **Privacy & Data Ownership** — Merchant data blijft altijd eigendom van de merchant. Geen onnodige cloud calls. GlobalBrain may never contain raw merchant data; KnowledgeTransfer is the only controlled bridge.

4. **Modulaire Architectuur** — Duidelijke bounded contexts en scheiding tussen intelligentie en business logic. Runtime modules follow `api → application → domain ← infrastructure`. Cross-module coupling goes through ports, not direct infrastructure imports.

5. **Autonomie met Controle** — Agents mogen veel autonoom doen; high-impact acties vereisen human approval. Merchants must always understand what the system is doing and why.

6. **Merchant Success First** — Iedere feature moet aantoonbaar waarde toevoegen voor de merchant. We verdienen alleen als de merchant significant meer verdient. Complexity is only added when it delivers clear, disproportionate value.

7. **Intellectual Honesty** — Alleen features claimen die écht werken met tests en evidence. Partial and experimental labels are honest, not failures. No placeholder that looks like a successful implementation.

---

## Authority hierarchy (runtime vs DNA)

When documents conflict:

1. `aether-core/docs/runtime-charter.md` + truth-matrix + feature-status.json (implementation truth)
2. Release gates and roadmap alignment (shipping criteria / planning)
3. This DNA folder (vision and principles — not implementation status)
4. `Project/Info/` and other archives (ambition only — never deployment truth)

**If any document conflicts with runtime evidence, runtime wins.**

---

## Related

- Vision: [`vision.md`](./vision.md)
- Architecture: [`architecture.md`](./architecture.md)
- Anti-patterns: [`anti-patterns.md`](./anti-patterns.md)
- Agent operating instructions: [`AGENTS.md`](./AGENTS.md)
- Compact agent context: [`interfaces/export/agent-context.md`](./interfaces/export/agent-context.md)
