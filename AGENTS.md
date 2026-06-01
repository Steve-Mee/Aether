# AGENTS.md - AETHER

**Execution truth (deployed code):** [`aether-core/docs/runtime-charter.md`](aether-core/docs/runtime-charter.md)  
**Vision & principles:** `project-dna/`  
**Archived specs (not deployed):** `Project/Info/`

## Project Purpose
AETHER is an AI-native merchant operating system built on radical simplicity. The goal is to give merchants powerful, autonomous tools while delivering a calm and premium experience.

## Core Principles
- Radical simplicity is a core advantage.
- Every feature must deliver clear value to the merchant.
- The AI/orchestration layer should be highly autonomous.
- Luxury emerges from clarity, speed, and intentional reduction — not from added complexity.
- Optimize for long-term merchant success.

## Architecture Guidance
- Maintain clear separation between the AI Brain/Orchestration layer and merchant logic.
- **Runtime stack:** Custom AETHER Core (Node.js + TypeScript + Prisma + PostgreSQL) — not MedusaJS.
- Design for autonomy: routine operations should require minimal human oversight.
- Keep the intelligence layer central and extensible.
- **Local AI First:** Ollama for Mail, Admin parser, optional agentic paths.

## Working Rules

### Design Philosophy
- Question complexity aggressively. If it can be meaningfully simpler, make it simpler.
- Prefer smart defaults over heavy configuration.
- Treat UI/UX as a core quality concern (calm, fast, intentional).

### Autonomy
- Prioritize solutions that reduce the need for ongoing human intervention.
- When building features, consider how they contribute to merchant autonomy.

### Quality Standards
- Use Plan Mode for significant architectural or cross-cutting changes.
- Apply modular architecture principles strictly.
- Wire dependencies via `aether-core/backend/src/bootstrap/compositionRoot.ts`.
- No `tenant_default` in repository persistence layers — explicit `tenantId` required.

## Output Standards
- Be concise and intentional.
- Focus on merchant value and system autonomy.
- Clearly separate exploration from production-ready work.

## Process
1. Start from `runtime-charter.md` for execution status, then `project-dna/` for vision.
2. Apply radical simplicity as a default lens.
3. Use the Recursive Self-Improvement protocol to capture learnings.
4. Keep the merchant and long-term autonomy in focus.
