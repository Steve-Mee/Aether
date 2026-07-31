# Storefront security checklist (P15)

Threat model for the vertical slice: admin Website API + public Storefront API + allowlisted codegen + preview HMAC + approval-gated deploy.

| Threat | Mitigation | Evidence |
|--------|------------|----------|
| Preview token forgery | HMAC-SHA256 + TTL; secret required when `NODE_ENV !== 'test'` | `application/services/previewToken.ts`, `previewToken.test.ts` |
| Cross-tenant preview escalation | Claims must match project `tenantId` + `projectId` | `resolvePublicStorefront.ts`, storefront HTTP “no leak” test |
| Path traversal via artifacts | Reject `..`, `/`, `\`; post-`resolve` must stay under artifacts root | `LocalFsArtifactStoreAdapter` + unit tests |
| Path injection via slug | DNS-safe slug allowlist (`parseStorefrontSlug`) on create **and** public resolve (invalid → `SITE_NOT_FOUND`) | `domain/validateStorefrontSlug.ts`, `resolvePublicStorefront.ts`, storefront HTTP invalid-slug test |
| Page path traversal in SitePlan | Reject `..`, `//`, `\`, null bytes in page paths | `sitePlanSchema.ts`, AllowlistCodegenCompiler fuzz |
| Public API abuse | Redis `rl:sf:${ip}` (60/min) when `REDIS_URL` set; memory + Postgres spill fallback under pressure | `storefrontRateLimit.ts`, `incrementFixedWindow`, `redisHybrid.test.ts` |
| Redis RAM pressure / data loss | Hybrid governor: soft demote runmem → spill; hard spill RL counters to `RedisSpill` before DEL | `RedisMemoryGovernor`, `RedisSpillStore`, migration `20260729180000_redis_spill` |
| Corrupt live pointer | `status=live` without `liveRevisionId`, or dangling revision → `SITE_NOT_FOUND` fail-closed | `resolvePublicStorefront.ts`, storefront HTTP tests |
| Live without artifacts | Live revision missing `artifactsPath` → `SITE_NOT_FOUND`; organism heal rebuilds or demotes | `resolvePublicStorefront.ts`, `HealBrokenLiveSitesUseCase` |
| Auto-publish via organism / CMS copy | Heal/wall/copy-edit never publish; Approvals only | organism use cases, `UpdatePageCopyUseCase` |
| Admin data leak on public routes | Public DTOs only | `storefront.http.test.ts` leak test |
| Viewer mutating website | Mutations `requireOperator`; GETs `requireViewer` | `website.rbac.test.ts` |
| Freeform / eval codegen | Allowlisted blocks + max tree depth | `AllowlistCodegenCompiler.test.ts` |
| Auto-publish | Only `PUBLISH_STOREFRONT` via ApprovalExecutor | approval handler tests + E2E |
| Feature accidentally on in prod | Defaults: builder / public API / deploy **off** | `featureFlags.ts`, `STOREFRONT_DEPLOY_ENABLED` |
| Cloudflare deploy without secrets | Fail-closed (never silent stub-as-CDN) | `CloudflareDeployAdapter` |
| PII in logs | `sanitizePiiForLogs`; checkout logs IDs only | `sanitizePiiForLogs.test.ts` |

## Safe defaults

| Flag / env | Default |
|------------|---------|
| `storefront-builder` / `STOREFRONT_BUILDER_ENABLED` | `false` |
| `storefront-public-api` / `STOREFRONT_PUBLIC_API_ENABLED` | `false` |
| `STOREFRONT_DEPLOY_ENABLED` | `false` |
| `STOREFRONT_DEPLOY_PROVIDER` | unset → stub; when deploy enabled → `local-edge` |
| `STOREFRONT_ORGANISM_ENABLED` | `true` |
| `REDIS_SPILL_ENABLED` | `true` |
| `STOREFRONT_PREVIEW_HMAC_SECRET` | required outside test |

## Residual backlog (planned, not Birth blockers)

- Property-based (fast-check) codegen fuzz in CI
- Multi-region; hive-mind storefront distillation
- Connect payout ledger / Stripe Elements (beyond local pilot transaction list)
