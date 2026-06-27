---
name: local-ai-patterns
description: >
  Definieert patronen voor Local AI First ontwikkeling: Ollama, vLLM, model routing,
  fallback strategieën en privacy-first LLM integratie.
---

# Local AI Patterns Skill (v1.0)

**Doel**: Zorgt dat AETHER waar mogelijk lokale AI gebruikt en cloud calls alleen doet met expliciete opt-in.

**Wanneer gebruiken**: Bij elke integratie met LLM’s of AI services.

---

## Kernregels

1. **Default = Local** (Ollama / vLLM) voor gevoelige operaties (Mail, Supplier, Admin commands).
2. Cloud LLM’s (OpenAI, Anthropic, etc.) alleen met expliciete merchant opt-in.
3. Altijd een duidelijke fallback strategie hebben (local → heuristic → cloud).
4. Alle LLM calls moeten gelogd worden met model, tokens en latency.
5. Privacy-sensitive data mag nooit onnodig naar externe providers.

---

## Anti-Patterns

- Directe cloud calls zonder opt-in mechanisme
- Geen fallback als lokale modellen falen
- LLM calls zonder logging of observability

---

*Versie 1.0 — AETHER Edition*
