# AETHER Pilot Log

Record weekly pilot metrics here. Do **not** mark Gate 8 or charter world-class items `[x]` until exit criteria are met with real tenant data.

**Runbook:** [`pilot-runbook.md`](./pilot-runbook.md)  
**Mail formula:** [`pilot-autonomy-metrics.md`](./pilot-autonomy-metrics.md)  
**Outcome contract:** [`pilot-outcome-contract.md`](./pilot-outcome-contract.md)

## Entries

| Date | Tenant | autoReplyRate | processed (replied+escalated) | approval gaps | causal verified | Notes |
|------|--------|---------------|-------------------------------|---------------|-----------------|-------|
| _YYYY-MM-DD_ | _tenant_id_ | _0.00_ | _0_ | _0_ | _no_ | _weekly snapshot_ |

## Staging demo (not production proof)

`SEED_PILOT_MAIL_DEMO=true npm run pilot:seed-demo` in `backend/` — synthetic `[PILOT_DEMO]` mails for script validation only.

## Exit criteria checklist

- [ ] Mail: `autoReplyRate >= 0.7` and `processed >= 100` over 30d (`GET /api/emails/metrics?days=30`)
- [ ] `PILOT_RELEASE=true npm run validate:dod` passes against pilot API
- [ ] Causal: holdout assignment + verified outcome + merchant sign-off ([`pilot-outcome-contract.md`](./pilot-outcome-contract.md))
- [ ] Approval: 4 consecutive weeks with zero approved-without-`action_executed` gaps
- [ ] Docs updated: `release-gates.md`, `runtime-charter.md`, `truth-matrix.md`, `feature-status.json` (only after measurement)
