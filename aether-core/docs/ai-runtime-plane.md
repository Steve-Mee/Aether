# AETHER AI Runtime Plane (MVP)

**Version:** 0.8.2

## Architecture
- **Ollama sidecar** in docker-compose (`ollama:11434`) — backend connects via internal network only
- **Supplier worker** isolated Playwright scrape container
- No outbound inference to cloud LLMs without explicit merchant opt-in

## Data boundaries
- Mail classification prompts: subject + body truncated to 4KB
- Admin NL commands: parser-only; destructive intents require approval gates
- PII redaction before LLM: `EmailClassifierService.sanitizeForLlm()` (email + phone redact, 4KB truncate)

## Network policy (docker)
- Backend `depends_on`: postgres, redis, ollama, supplier-worker
- Ollama: internal docker network only (`aether_internal`); no host port `:11434` publish

## Verification
- `ollamaContract.test.ts` validates compose dependency
- CI: Ollama service container + health check when `OLLAMA_CONTRACT_TEST=true`

Last updated: Plan Completion Sprint 4
