# AETHER Pilot Runbook

Operational steps for Gate 8 and causal pilot exit. Engineering checks: `node scripts/pilot-metrics-check.js`.

## 0. Staging demo (local Gate 8 dry-run)

Synthetic data only — **not** proof for production charter `[x]`. Use to verify scripts and `PILOT_RELEASE` validation.

```bash
cd aether-core/backend
# PowerShell:
# $env:SEED_PILOT_MAIL_DEMO='true'
# bash: SEED_PILOT_MAIL_DEMO=true

SEED_PILOT_MAIL_DEMO=true PILOT_DEMO_REPLACE=true npm run pilot:seed-demo

PILOT_TENANT_ID=tenant_pilot_demo npm run pilot:metrics

# API running (npm run dev):
PILOT_RELEASE=true \
AETHER_API_KEY=pilot-demo-api-key \
AETHER_DEFAULT_TENANT=tenant_pilot_demo \
npm run validate:dod
```

Demo tenant: `tenant_pilot_demo` (78 replied + 26 escalated ≈ 75% ratio). Emails tagged `[PILOT_DEMO]` / `pilot-demo-sender@aether.local`.

## 1. Pilot tenant setup

1. Create tenant in DB (or use existing merchant tenant).
2. Configure API key bound to tenant (`ApiKey` table or `AETHER_API_KEY` env for single-tenant dev).
3. Start stack: `docker compose up -d` from `aether-core/` (PostgreSQL, Ollama, backend).
4. Enable mail:
   - `Mailbox` credentials for tenant (IMAP/SMTP in admin or env).
   - Ollama model pulled: `ollama pull llama3.2` (or `OLLAMA_MODEL`).
5. Optional merchant webhooks: `MERCHANT_NOTIFICATIONS_ENABLED=true`, `MERCHANT_WEBHOOK_URL`.

## 2. Weekly mail metrics (30 days)

```bash
# From aether-core/backend (API running)
curl -s -H "X-Aether-Api-Key: $AETHER_API_KEY" \
  -H "X-Aether-Tenant-Id: $PILOT_TENANT_ID" \
  "$AETHER_API_URL/api/emails/metrics?days=30" | jq .
```

Or DB-backed check (no running API required):

```bash
cd aether-core
DATABASE_URL=... PILOT_TENANT_ID=... node scripts/pilot-metrics-check.js
```

Append results to [`pilot-log.md`](./pilot-log.md).

**Exit:** `autoReplyRate >= 0.7` and `pilotProcessedCount >= 100`.

## 3. Release validation (after exit)

```bash
cd aether-core/backend
PILOT_RELEASE=true \
AETHER_API_URL=http://localhost:9000 \
AETHER_API_KEY=... \
AETHER_DEFAULT_TENANT=... \
npm run validate:dod
```

## 4. Causal uplift pilot

1. Complete merchant agreement template in [`pilot-outcome-contract.md`](./pilot-outcome-contract.md).
2. Create `ExperimentAssignment` for pilot tenant + metric.
3. Record outcome via independent path; verify with holdout evidence.
4. Run: `PILOT_CAUSAL=true npm run validate:dod` (requires DB + assignment + verified outcome).

## 5. Approval integrity (weekly)

`pilot-metrics-check.js` reports approvals without `action_executed` audit. Target: **0 gaps** for 4 weeks before charter `[x]` on approval integrity.

## 6. Truth doc updates (after measurement only)

Update [`release-gates.md`](./release-gates.md) Gate 8 mail line, [`runtime-charter.md`](./runtime-charter.md) world-class section, [`truth-matrix.md`](./truth-matrix.md) 70% row, and [`feature-status.json`](./feature-status.json) if promoting mail status.
