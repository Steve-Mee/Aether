# Prompts roadmap — Wave 1–7 status

Honest status of the **Toekomstige Prompts** execution waves vs [`feature-status.json`](./feature-status.json).  
Statuses: `implemented` / `live` / `partial` / `not_started`.

Last reviewed: 2026-08-01 (zero-placeholder integration pass).

## Wave 1 — Multi-agent extensions

| Prompt | feature-status key | Status | Notes |
|--------|-------------------|--------|-------|
| 1.2 Returns & Quality Agent | `returns-quality-agent` | **partial** | Tools persist insights/approvals (no fake success) |
| 1.1 Marketing & Promotion | `marketing-promotion-agent` | **partial** | Propose tools persist via `CreatePromotionUseCase` |
| 1.3 Lead / Workflow Supervisor | `lead-workflow-supervisor` | **partial** | `planGoalSubtasks`, synthesize, HITL gate |
| Multi-agent baseline | `multi-agent-delegation` | **implemented** | Pause enforced in router/runner; proactive skips paused agents |

## Wave 2 — Brain & learning

| Prompt | feature-status key | Status | Notes |
|--------|-------------------|--------|-------|
| 2.3 Strategic LTM | `strategic-ltm` | **partial** | Wired into `PersonalBrainMemoryService.recallForCommand` |
| 2.1 Strategic reflection | `strategic-reflection` | **partial** | Job loads real active goals; empty → skip store |
| 2.2 KnowledgeTransfer enhance | `knowledge-transfer-category-optout` | **partial** | Hive gate + Settings checkboxes |
| Intelligence / hive baseline | `intelligence-layer`, `hive-mind` | **partial** | Pre-existing loop |

## Wave 3 — UX, adoption, autonomy polish

| Prompt | feature-status key | Status | Notes |
|--------|-------------------|--------|-------|
| 3.3 Goals aggressiveness | `goals-aggressiveness` | **partial** | `pursuitMode` backend + UI |
| 3.2 Suggestions UI | `proactive-suggestions-ui` | **partial** | Grouping + confidence mapping |
| 3.1 Command Center controls | `command-center-agent-controls` | **partial** | Live roster activity; pause blocks delegation |
| 5.1 Onboarding | `merchant-onboarding` | **partial** | Soft redirect guard + illustrative quick-wins |
| 5.2 Capability hub | `capability-hub` | **partial** | Labeled demos; badges from feature-status |
| 4.1 / 4.2 Autonomy polish | — | **skipped** | Per roadmap unless bugs |

## Wave 4 — Resilience, performance, tests

| Prompt | feature-status key | Status | Notes |
|--------|-------------------|--------|-------|
| 6.1 Resilience | `multi-agent-resilience` | **partial** | Retry + `orchestratorFallback` in parallel path |
| 6.2 Performance | `multi-agent-performance` | **partial** | Routing cache |
| 9.1 Agent test suite | `multi-agent-test-suite` | **partial** | Handoffs / goal-pursuit / honest-tools tests |

## Wave 5 — Integrations

| Prompt | feature-status key | Status | Notes |
|--------|-------------------|--------|-------|
| 7.1 AETHER Mail deepen | `aether-mail` | **partial** | Draft persist + approve → SMTP send |
| 7.2 Channel Sync | `channel-sync` | **partial** | Sync import, inventory push, metrics, OAuth, Settings enable |

## Wave 6 — Self-hosted & enterprise

| Prompt | feature-status key | Status | Notes |
|--------|-------------------|--------|-------|
| 8.1 Self-hosted ops | `self-hosted-ops` | **partial** | `scripts/install|update|backup|restore` (+ runbooks) |
| 8.2 Enterprise SSO | `enterprise-sso` | **partial** | OIDC PKCE; Redis session store + Map fallback |

## Wave 7 — Documentation

| Prompt | feature-status key | Status | Notes |
|--------|-------------------|--------|-------|
| 9.2 Docs/DX | `developer-docs` | **partial** | Multi-agent README, KT, self-host, this file |

## Zero-placeholder notes

- Activity feed demo padding: off unless `VITE_LIVE_DEMO=true` or `VITE_HYBRID_DEMO=true` (not implicit in DEV).
- Propose-tool `executeConfirmed` must persist or return `success: false`.
- Channel Sync still requires credentials + feature flag / tenant toggle — not a silent stub.

## Doc map

| Topic | Doc |
|-------|-----|
| Multi-agent + how to add an agent | [`backend/.../multi-agent/README.md`](../backend/src/ai/intelligence/multi-agent/README.md) |
| Knowledge transfer | [`knowledge-transfer.md`](./knowledge-transfer.md) |
| Architecture | [`intelligence-layer.md`](./intelligence-layer.md), [`runtime-charter.md`](./runtime-charter.md) |
| Self-hosted install | [`self-hosted-install.md`](./self-hosted-install.md) |
| SSO OIDC | [`sso-oidc-setup.md`](./sso-oidc-setup.md) |
| Claim policy | [`feature-status.json`](./feature-status.json), [`roadmap-alignment.md`](./roadmap-alignment.md) |
