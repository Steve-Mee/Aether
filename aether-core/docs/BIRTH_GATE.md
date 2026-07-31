# Birth Gate — Storefront closed loop

**Date:** 2026-07-28  
**Evidence:** automated DB-backed E2E in CI (not marketing claims)

Appendix I checklist (playbook):

- [x] `FEATURE_STOREFRONT_BUILDER` / public flags default **false** in `.env.example`
- [x] Create project from brief → revision exists
- [x] BuildJob `succeeded` + `previewUrl` on port **4177**
- [x] Preview token TTL **15 minutes** (expired rejected in test)
- [x] Public rate limit **60 req/min/IP** documented + tested
- [x] Compiler rejects unknown blocks + rejects overrides
- [x] Propose publish with qaScore < **0.80** → `QA_BELOW_THRESHOLD`
- [x] Publish creates **pending** approval (not auto-live)
- [x] Approve execute → `status=live` + `liveRevisionId` set
- [x] `GET /api/storefront/:slug/pages?path=/` returns allowlisted tree
- [x] Cross-tenant access denied / 404 (storefront HTTP + cart security cases)
- [x] Admin `/website` + `/pages` routes load without fake “live” badges
- [x] E2E file exists and green: [`../backend/src/modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts`](../backend/src/modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts)
- [x] No P11+ work started before this PASS (P11+ may land only after Birth Gate PASS)
- [x] On any FAIL: Appendix J followed
- [x] Final line of report: `BIRTH_GATE=PASS`

## Status honesty

Storefront Builder / public API remain **partial** in feature-status — vertical slice proven; no pilot edge deploy; no “60s live store” claim.

BIRTH_GATE=PASS
