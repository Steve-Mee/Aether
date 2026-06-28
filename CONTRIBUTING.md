# Contributing to AETHER

Thank you for contributing to AETHER Core. This guide covers the development workflow, CI expectations, and merge requirements.

## Branch protection (GitHub Settings)

Configure these rules on `main` and `develop` in **Settings → Branches → Branch protection rules**:

| Rule | Setting |
|------|---------|
| Required status checks | `backend`, `frontend` (from [`.github/workflows/ci.yml`](.github/workflows/ci.yml)) |
| Require pull request reviews | At least **1** approving review |
| Dismiss stale reviews | Recommended when new commits are pushed |
| Require branches to be up to date | Recommended before merge |
| Restrict direct pushes | Recommended — all changes via PR |

## Development workflow

1. Create a feature branch from `main` or `develop`.
2. Make changes under `aether-core/`.
3. Run local checks before opening a PR (see below).
4. Open a pull request targeting `main` or `develop`.
5. Wait for CI (`backend` + `frontend` jobs) to pass.
6. Request review; address feedback.
7. Merge when green + approved.

## What runs on push / pull request

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

**Triggers:** push and pull_request to `main` or `develop`, when files under `aether-core/**` or `.github/**` change.

**Concurrency:** in-progress runs for the same branch are cancelled when new commits are pushed.

### `backend` job

Runs in `aether-core/backend` with Postgres, Stripe mock, and Ollama services.

- Integration tests (supplier, Stripe, mail, webhooks, tenant isolation, merchant auth)
- Prisma validate, migrate, generate
- TypeScript check and build
- Jest coverage gate (≥60%)
- Governance scripts: `truth-review.js`, `validate-runtime.js`, `validate-dod.js`

### `frontend` job

Runs in `aether-core/frontend` (parallel with backend).

| Step | Command | Gate |
|------|---------|------|
| TypeScript | `npm run lint` | Fail |
| ESLint | `npm run lint:eslint` | Fail |
| Prettier | `npm run format:check` | Fail |
| Unit tests | `npm test` | Fail |
| Coverage | `npm run test:coverage` | Informational |
| UI copy | `npm run verify:copy` | Fail |
| Build | `npm run build` + `build:staging` | Fail |
| Bundle size | `npm run size:check` | Fail |
| E2E flows | `npm run test:flows` | Fail |
| Visual regression | `npm run test:visual` | Fail |
| Accessibility | `npm run test:a11y` | Fail |
| jsx-a11y lint | `npm run lint:a11y` | Warn-only |
| Security audit (prod) | `npm run audit:ci` | Fail (production deps, moderate+) |
| Security audit (dev) | `npm run audit:ci:dev` | Informational |

Frontend runs upload Playwright and coverage artifacts (see **CI artifacts** below).

### Lighthouse CWV (weekly, not on every PR)

Workflow: [`.github/workflows/lighthouse-weekly.yml`](.github/workflows/lighthouse-weekly.yml) — Mondays 06:00 UTC or manual dispatch. Gates performance score per route (default `LH_MIN_SCORE=0.60`; stretch target 0.75 documented in performance.md).

### Pilot gates (not on every PR)

Workflow: [`.github/workflows/pilot-gates.yml`](.github/workflows/pilot-gates.yml) — manual dispatch or weekly schedule (Mondays 08:00 UTC).

## Local checks before a PR

### Frontend

**Fast path (matches most CI gates, no Playwright):**

```bash
cd aether-core/frontend
npm ci
npm run verify:ci
```

**Full path (includes E2E — run before UI/routing PRs):**

```bash
npx playwright install chromium
npm run verify:ci:e2e
```

Format fixes: `npm run format`

### Backend

```bash
cd aether-core/backend
npm ci
npm run verify:ci
```

Full local run (slower, includes all integration tests): `npm run lint && npm test && npm run build`

## Visual regression snapshots

When Playwright visual tests fail due to intentional UI changes:

```bash
cd aether-core/frontend
npm run build
npm run test:visual:update
```

Commit the updated PNG files under `e2e/visual/**/*.png`.

## Optional CI secrets

These are not required for CI to pass:

| Secret | Purpose |
|--------|---------|
| `SENTRY_AUTH_TOKEN` | Sourcemap upload (backend + frontend build) |
| `SENTRY_ORG` | Sentry organization |
| `SENTRY_PROJECT` | Sentry project |
| `SENTRY_BACKEND_PROJECT` | Backend-specific Sentry project override |
| `VITE_SENTRY_DSN` | Frontend Sentry DSN at build time |

## Preview deployments (optional)

PR preview URLs are not enabled by default. To add them:

1. Choose a host: [Vercel](https://vercel.com), [Netlify](https://netlify.com), or [Cloudflare Pages](https://pages.cloudflare.com).
2. Connect the GitHub repository in the host dashboard.
3. Set the build root to `aether-core/frontend`, build command `npm run build`, output `dist`.
4. For a GitHub Actions workflow, copy [`.github/workflows/preview-deploy.yml.example`](.github/workflows/preview-deploy.yml.example) to `preview-deploy.yml` and add secrets:

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel team/org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

Preview deployments make UI review faster — each PR gets a unique URL before merge.

## Node.js version

Use **Node 20** (see [`.nvmrc`](.nvmrc) at repo root or `aether-core/frontend/.nvmrc`). CI uses `node-version: '20'`.

## Dependabot

[`.github/dependabot.yml`](.github/dependabot.yml) opens weekly PRs for npm dependencies (frontend + backend) and monthly for GitHub Actions. Review and merge like any other PR — CI must pass.

## Pull request template

New PRs use [`.github/pull_request_template.md`](.github/pull_request_template.md) with a checklist. Fill it in so reviewers know what was tested.

## CI artifacts

Failed or completed frontend runs upload:

- `playwright-report-<run_id>` — HTML report + test-results (14 days)
- `frontend-coverage-<run_id>` — Vitest coverage (7 days, informational)

Download from the GitHub Actions run → **Artifacts**.

## Manual CI re-run

Re-trigger the full pipeline from **Actions → AETHER Core CI → Run workflow** (`workflow_dispatch`).

## GitHub setup checklist (one-time)

Complete after merging the CI/CD workflows:

1. **Settings → Branches → Add rule** for `main` and `develop`
2. Enable **Require status checks**: `backend`, `frontend`
3. Enable **Require pull request reviews** (1 approval)
4. **Settings → Code security → Dependabot** — enable security updates and version updates
5. Push a test PR and confirm both jobs pass in **Actions**
6. Optionally enable preview deploys (see **Preview deployments** above)

## First-time CI verification

Track the open verification PR: [PR #1 — CI/CD pipeline](https://github.com/Steve-Mee/Aether/pull/1) on branch `ci-cd-perfection`.

After merge, confirm on each PR:

- `backend` job green (Postgres + Ollama + Stripe mock services)
- `frontend` job green (Playwright + size-limit)
- Artifacts downloadable from the run page (playwright-report, coverage)

If Playwright flow tests fail in CI but pass locally, re-run with `npm run build && npm run verify:ci:e2e` and compare artifacts from the failed GitHub run.

## Questions

- Execution truth: [`aether-core/docs/runtime-charter.md`](aether-core/docs/runtime-charter.md)
- Release gates: [`aether-core/docs/release-gates.md`](aether-core/docs/release-gates.md)
- Frontend testing: [`aether-core/frontend/docs/testing.md`](aether-core/frontend/docs/testing.md)
