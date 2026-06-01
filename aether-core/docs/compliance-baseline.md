# AETHER Compliance Baseline

**Version:** 0.8.2  
**Scope:** `aether-core/` runtime

## Secrets management
- All secrets via environment variables only (`.env` never committed)
- API keys stored hashed in `ApiKey` table
- Webhook secrets per endpoint (`SUPPLIER_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`)

## PII handling
- Audit logs must not store full email bodies in production without redaction
- `EmailRollbackService` and mail processing log classification metadata only
- LLM input sanitized via `EmailClassifierService.sanitizeForLlm()` (email/phone redact, 4KB truncate)

## Data retention (skeleton)
- `AuditLog`, `DomainEvent`, `EmailMessage` — default retention 365 days (configurable via `DATA_RETENTION_DAYS`)
- Scheduled purge: `node scripts/data-retention.mjs` (audit logs older than `DATA_RETENTION_DAYS`, default 365)

## GDPR by design
- Tenant-scoped data isolation enforced at repository layer
- Right to erasure: tenant delete cascades via Prisma (manual operator procedure documented)
- Data export: `/api/admin/truth-status` + module GET endpoints per tenant

## Billing integrity
- Billable outcomes require `OutcomeVerificationService` evidence path
- Blocked sources: `admin.price_update`, `command.executed`

Last updated: Plan Completion Sprint 3
