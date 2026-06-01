# Pilot Autonomy Metrics

**Gate 8 exit criteria** — see [`release-gates.md`](./release-gates.md)

## Mail auto-reply ratio

**Formula (30-day rolling, per tenant):**

```
autoReplyRatio = replied / (replied + escalated)
```

- **replied:** `EmailMessage.status = 'replied'` with `sentAt` in window
- **escalated:** `EmailMessage.status = 'escalated'` in window
- **Excluded:** `received`, `draft_ready`, cancelled rollbacks

**Data source:** `GET /api/emails/metrics?days=30` (field `pilotProcessedCount` = replied + escalated)

**DB check (weekly):** `DATABASE_URL=... PILOT_TENANT_ID=... node scripts/pilot-metrics-check.js`

**Pilot exit:** ≥ **70%** auto-reply ratio with minimum **100** processed emails in the window.

**Honest partial:** Until pilot data exists, status remains `partial` in [`feature-status.json`](./feature-status.json).

## Approval execute integrity

**Formula:**

```
pendingExecutedRatio = approvals_with_action_executed_audit / approvals_approved
```

**Data source:** `AuditLog` where `action = 'action_executed'` and `details` contains `approvalId`.

**Target:** 100% — enforced by [`ApprovalExecutor`](../backend/src/shared/approval/approvalExecutor.ts).

## Weekly review

Run `node scripts/truth-review.js` and record metrics in pilot log. Do not mark Gate 8 `[x]` until thresholds are met in production or staging pilot tenant.
