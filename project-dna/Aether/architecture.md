# Architecture

## High-Level Overview

AETHER is built as an AI-first merchant operating system with a clear separation between intelligence, business logic, and presentation.

### Core Layers

1. **AI Brain / Orchestration Layer**
   - Central intelligence and decision-making
   - In-process Orchestrator + task map (no LangGraph in runtime)
   - Context management and memory
   - Autonomous routine operations

2. **Merchant Logic Layer**
   - Core business workflows (orders, inventory, customers, content, etc.)
   - Business rules and processes
   - **Runtime:** Custom AETHER Core (Node.js + Prisma) — not MedusaJS in production

3. **Data Layer**
   - Persistent storage (PostgreSQL)
   - Data models and access patterns
   - Event sourcing / auditability where relevant

4. **Presentation / UI Layer**
   - Merchant-facing interfaces (React)
   - Calm, fast, and intentional design
   - Progressive disclosure of complexity

## Key Architectural Principles

- **AI layer as the orchestrator**, not just a helper.
- **Strong separation** between intelligence and business logic to allow independent evolution.
- **Radical simplicity** in every layer — complexity is only added when it delivers clear, disproportionate value.
- **Autonomy by design** — routine tasks should be handled intelligently without constant human input.
- **Observable and controllable** — merchants should always understand what the system is doing and why.

## Current Focus Areas

- Building a robust and autonomous AI orchestration layer.
- Maintaining clean boundaries between layers to support long-term evolution.
- Designing for merchant autonomy while keeping the system understandable and trustworthy.
- Establishing patterns that favor simplicity and maintainability over feature richness.