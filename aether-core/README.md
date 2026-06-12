# AETHER Core — Production Execution Baseline

[![AETHER Core CI](https://github.com/Steve-Mee/Aether/actions/workflows/ci.yml/badge.svg)](https://github.com/Steve-Mee/Aether/actions/workflows/ci.yml)

**This repository (`aether-core/`) is the only deployment source of truth.**

Canonical execution charter: [`docs/runtime-charter.md`](docs/runtime-charter.md)

Reference materials in `../Project/` are archived specs and demos — not shipped.

## Quick Start

```bash
cd aether-core/backend
npm install
npm run setup:env          # generates secure keys in ../.env
cd ..
docker compose up -d postgres   # Postgres on localhost:15432 (avoids native Windows PG on 5432)
cd backend
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Backend: http://localhost:9000  
Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173

## API keys (self-managed)

AETHER uses **your own** API keys — not from Stripe, Google, or any external provider.

| Variable | Purpose |
|----------|---------|
| `AETHER_API_KEY` | Backend auth (`X-Aether-Api-Key` header) |
| `VITE_AETHER_API_KEY` | Frontend sends the same key to the API |
| `HIVE_MIND_SALT` | Cryptographic salt for Hive Mind anonymization |

Generate them automatically:

```bash
cd aether-core/backend
npm run setup:env          # creates ../.env if missing
npm run setup:env -- --force   # regenerate secrets
```

Both frontend and backend read from `aether-core/.env`.

## Project Structure

```
aether-core/
├── scripts/generate-env.js   # Secret generator for setup
├── backend/src/
│   ├── modules/          # Domain modules (DDD layers)
│   ├── shared/           # Auth, events, logging, prisma
│   └── ai/               # Orchestration, attribution
├── frontend/src/         # Merchant admin UI
└── docs/                 # truth-matrix, release-gates
```

## Authentication

Requests require headers:
- `X-Aether-Api-Key` — value from `AETHER_API_KEY` in `.env`
- `X-Aether-Tenant-Id` (optional; defaults to `AETHER_DEFAULT_TENANT`)

## Scripts

| Command | Location | Description |
|---------|----------|-------------|
| `npm run setup:env` | backend/ | Generate `.env` secrets |
| `npm run dev` | backend/ | API server |
| `npm run build` | backend/ | Compile TypeScript |
| `npm test` | backend/ | Jest tests |
| `npm run prisma:seed` | backend/ | Default tenant + sample products |
| `npm run dev` | frontend/ | Vite admin UI |

## CI/CD

GitHub Actions workflows live at the **repository root** (not under `aether-core/.github/`):

| Workflow | Trigger | Jobs |
|----------|---------|------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Push/PR to `main` or `develop` (`aether-core/**`) | `backend`, `frontend` (parallel) |
| [`.github/workflows/pilot-gates.yml`](../.github/workflows/pilot-gates.yml) | Manual / weekly schedule | `pilot-metrics` |

See **[CONTRIBUTING.md](../CONTRIBUTING.md)** for branch protection rules, local pre-PR checks, and optional preview deployments.

## Documentation

- [Truth Matrix](./docs/truth-matrix.md) — feature status vs code
- [Release Gates](./docs/release-gates.md) — ship criteria (no green checkbox without CI proof)
- [Roadmap Alignment](./docs/roadmap-alignment.md)
- [Contributing](../CONTRIBUTING.md) — CI workflow and merge requirements

Run `npm run validate:dod` from `backend/` before release — CI enforces this automatically.  
Run `node scripts/truth-review.js` weekly for claim vs runtime alignment.

### Pilot gates (Gate 8)

- Runbook: [`docs/pilot-runbook.md`](./docs/pilot-runbook.md)
- Weekly DB metrics: `npm run pilot:metrics` (requires `DATABASE_URL`, `PILOT_TENANT_ID`)
- Snapshot log row: `npm run pilot:snapshot` (requires running API + `AETHER_API_KEY`)
- Mail exit validation: `PILOT_RELEASE=true npm run validate:dod`
- Causal exit validation: `PILOT_CAUSAL=true npm run validate:dod`
- CI workflow: `.github/workflows/pilot-gates.yml` (manual / weekly schedule)
- Commerce integration tests locally: `RUN_COMMERCE_INTEGRATION=true npm test -- commerce.integration`
- Staging mail Gate 8 dry-run: `SEED_PILOT_MAIL_DEMO=true npm run pilot:seed-demo` (see [`docs/pilot-runbook.md`](./docs/pilot-runbook.md) §0)

## Environment (security & ecosystem)

| Variable | Purpose |
|----------|---------|
| `AETHER_TEST_AUTH_BYPASS` | `true` only in isolated RBAC unit tests — never in production |
| `ECOSYSTEM_JOBS_ENABLED` | `true` to start federated hive jobs after core reliability gates pass |

**Merchant Success First. Local AI First. Radical honesty.**
