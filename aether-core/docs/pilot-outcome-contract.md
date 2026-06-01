# Pilot Outcome Contract Template

Billable outcomes require **independent verification** — see [`OutcomeVerificationService`](../backend/src/shared/outcomes/OutcomeVerificationService.ts).

## Merchant agreement (template)

1. **Metric:** incremental revenue attributable to AETHER (e.g. `revenue`, `conversion_rate`).
2. **Baseline period:** 30 days before treatment.
3. **Treatment period:** 30 days after AETHER activation.
4. **Holdout:** minimum 10% traffic or merchants in control bucket via `ExperimentAssignment`.
5. **Billable rule:** uplift × confidence ≥ 0.75 and `verificationStatus = verified` before `billable`.

## Technical requirements

- Create outcome via independent path (not `admin.*` or `command.executed` — blocked by firewall).
- Verify with evidence: `POST /api/outcomes/verify` with `method: holdout_experiment` or `causal_uplift`.
- Billable transition requires prior `verified` status.

## Pilot checklist

- [ ] Holdout experiment assigned for pilot tenant + metric
- [ ] At least one outcome record with `verificationStatus: billable`
- [ ] Causal uplift documented in audit log
- [ ] Merchant sign-off on uplift calculation

## Engineering validation

```bash
# DB checks (staging/production pilot tenant)
DATABASE_URL=... PILOT_TENANT_ID=... PILOT_CAUSAL=true node scripts/pilot-metrics-check.js

# Full DoD with causal gate
cd backend && PILOT_CAUSAL=true DATABASE_URL=... npm run validate:dod
```

Record progress in [`pilot-log.md`](./pilot-log.md).
