# Self-hosted install guide

**Status:** partial — docker-compose + npm quick start remain primary; install/update/backup/restore scripts exist under [`scripts/`](../scripts/) (`install.sh` / `install.ps1`, `update.*`, `backup.*`, `restore.*`). See also [`backup-restore-runbook.md`](./backup-restore-runbook.md) and [`monitoring-dashboard-guide.md`](./monitoring-dashboard-guide.md).

Canonical quick start also lives in [`README.md`](../README.md).

## Path C — Scripts helper

```bash
cd aether-core
# Linux/macOS
./scripts/install.sh
./scripts/backup.sh
# Windows PowerShell
.\scripts\install.ps1
.\scripts\backup.ps1
```

Scripts wrap Compose + env bootstrap; they do **not** claim HA or automated multi-node restore.

## Prerequisites

- Docker + Docker Compose v2
- Node.js 20+ (for host-side backend/frontend if not using Compose app services)
- Optional GPU host for larger Ollama models (CPU works for `llama3.2` / `nomic-embed-text`)

## Path A — Infrastructure via Compose, apps on host (common for Windows)

```bash
cd aether-core
docker compose up -d postgres redis ollama
# optional: ollama-init pulls nomic-embed-text + llama3.2
docker compose up -d ollama-init

cd backend
npm install
npm run setup:env          # writes ../.env (AETHER_API_KEY, HIVE_MIND_SALT, …)
npm run prisma:migrate
npm run prisma:seed
npm run dev                # http://localhost:9000
```

```bash
cd aether-core/frontend
npm install
npm run dev                # http://localhost:5173
```

Postgres is published on **host port `15432`** (maps to 5432 in the container) to avoid clashing with native Windows PostgreSQL.

Point `DATABASE_URL` at `localhost:15432` when running the API on the host (see `.env` / `.env.example`).

## Path B — Full stack via Compose

From `aether-core/`:

```bash
# Ensure secrets exist (host script)
cd backend && npm run setup:env && cd ..

docker compose up -d
```

Services (see [`docker-compose.yml`](../docker-compose.yml)):

| Service | Port / notes |
|---------|----------------|
| `postgres` | host `15432` → `pgvector/pgvector:pg15` |
| `redis` | `6379` |
| `kafka` | `9092` (optional messaging; default broker mode often `none`) |
| `ollama` | internal only (`http://ollama:11434` from backend) |
| `ollama-init` | one-shot model pull |
| `backend` | `9000` |
| `frontend` | `5173` |
| `supplier-worker` | `8090` (`scripts/supplier-worker-server.mjs`) |
| `peer-worker` / `federated-worker` | optional multi-agent / federated jobs |
| `jaeger` | UI `16686`, OTLP `4318` |

## Scripts that exist (not a full installer)

| Script | Role |
|--------|------|
| `scripts/generate-env.js` | Invoked by `npm run setup:env` — generates secrets into `.env` |
| `scripts/ollama-init-models.sh` | Pull embed + chat models (Compose `ollama-init` uses inline pull) |
| `scripts/validate-runtime.js` / `validate-dod.js` | Runtime / DoD checks |
| `scripts/verify-observability-setup.js` | Observability preflight |
| `scripts/supplier-worker-server.mjs` | Allowlisted supplier scrape worker |
| `scripts/data-retention.mjs` | Retention helper |
| `scripts/pilot-*.js` | Pilot metrics / snapshots |

**Missing today (document as gaps, Wave 6):** one-command install/update script, automated backup/restore runbook CLI, turnkey monitoring dashboard packaging beyond Jaeger + Sentry ([`observability-runbook.md`](./observability-runbook.md)).

## Intelligence / Local AI First

Recommended self-hosted brain settings:

```bash
INTELLIGENCE_EMBEDDING=ollama
OLLAMA_BASE_URL=http://localhost:11434   # or http://ollama:11434 inside Compose
OLLAMA_EMBED_MODEL=nomic-embed-text
INTELLIGENCE_VECTOR_BACKEND=pgvector     # or lancedb JSON file store for portable export
INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED=false  # opt-in
```

After switching embedding backends:

```bash
cd backend
npm run brain:reembed
npm run brain:verify-schema
```

Portable vector export/import: see [`intelligence-layer.md`](./intelligence-layer.md) (`GET/POST /api/admin/brain/export|import`). Feature-status: `intelligence-self-hosted` — **partial**.

## Smoke checks

```bash
cd aether-core/backend
npm run validate:dod
# optional:
node ../scripts/validate-runtime.js
node ../scripts/verify-observability-setup.js
```

Health: `GET http://localhost:9000/health` (or project health route as configured).

## Related

- [`runtime-charter.md`](./runtime-charter.md) — deployment truth  
- [`intelligence-layer.md`](./intelligence-layer.md) — brain env + tiers  
- [`knowledge-transfer.md`](./knowledge-transfer.md) — KT privacy controls  
- [`observability-runbook.md`](./observability-runbook.md) — Sentry / tracing  
