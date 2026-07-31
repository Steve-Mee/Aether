/**
 * BIRTH GATE — Storefront vertical-slice E2E (DB-backed).
 * Locked path (Appendix G): modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts
 *
 * Prove:
 * - FEATURE_STOREFRONT_BUILDER + FEATURE_STOREFRONT_PUBLIC_API enable Birth
 * - POST project from brief → build succeeded → previewUrl on :4177
 * - qaScore ≥ 0.80 can propose publish; < 0.80 → QA_BELOW_THRESHOLD
 * - POST publish → approval pending → executeApprovedAction → live
 * - GET /api/storefront/:slug/pages?path=/ returns allowlisted tree
 * - Preview token TTL 15m (expired rejected)
 * - Public rate limit default 60 req/min/IP
 * - Flags off remain gated (security)
 *
 * Runs when CI=true or RUN_STOREFRONT_E2E=1 (opt-in local Birth proof).
 */
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../shared/prisma/client';
import {
  PREVIEW_TOKEN_TTL_MS,
  signPreviewToken,
} from '../application/services/previewToken';
import {
  STOREFRONT_PUBLIC_RATE_LIMIT_MAX_DEFAULT,
  resetStorefrontRateLimitForTests,
} from '../api/storefrontRateLimit';

const runBirthE2E =
  process.env.CI === 'true' || process.env.RUN_STOREFRONT_E2E === '1';
const describeIfDb = runBirthE2E ? describe : describe.skip;

describeIfDb('Storefront Birth Gate E2E (DB-backed)', () => {
  const app = createApp();
  const headers = {
    'X-Aether-Api-Key': process.env.AETHER_API_KEY ?? 'ci-test-key',
    'X-Aether-Tenant-Id': 'tenant_default',
    'X-Aether-Actor-Id': 'storefront-birth-e2e',
  };

  const prevBuilder = process.env.STOREFRONT_BUILDER_ENABLED;
  const prevPublic = process.env.STOREFRONT_PUBLIC_API_ENABLED;
  const prevFeatureBuilder = process.env.FEATURE_STOREFRONT_BUILDER;
  const prevFeaturePublic = process.env.FEATURE_STOREFRONT_PUBLIC_API;
  const prevPreviewSecret = process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
  const prevRateLimitMax = process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX;

  let slug: string;

  beforeAll(() => {
    process.env.AETHER_API_KEY = process.env.AETHER_API_KEY ?? 'ci-test-key';
    process.env.NODE_ENV = 'test';
    process.env.STOREFRONT_PREVIEW_HMAC_SECRET =
      process.env.STOREFRONT_PREVIEW_HMAC_SECRET || 'ci-storefront-preview-hmac-secret';
    slug = `birth-${Date.now().toString(36)}`;
  });

  afterAll(async () => {
    if (prevBuilder === undefined) delete process.env.STOREFRONT_BUILDER_ENABLED;
    else process.env.STOREFRONT_BUILDER_ENABLED = prevBuilder;
    if (prevPublic === undefined) delete process.env.STOREFRONT_PUBLIC_API_ENABLED;
    else process.env.STOREFRONT_PUBLIC_API_ENABLED = prevPublic;
    if (prevFeatureBuilder === undefined) delete process.env.FEATURE_STOREFRONT_BUILDER;
    else process.env.FEATURE_STOREFRONT_BUILDER = prevFeatureBuilder;
    if (prevFeaturePublic === undefined) delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
    else process.env.FEATURE_STOREFRONT_PUBLIC_API = prevFeaturePublic;
    if (prevPreviewSecret === undefined) delete process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
    else process.env.STOREFRONT_PREVIEW_HMAC_SECRET = prevPreviewSecret;
    if (prevRateLimitMax === undefined) delete process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX;
    else process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX = prevRateLimitMax;
    resetStorefrontRateLimitForTests();

    try {
      await prisma.siteProject.deleteMany({
        where: { tenantId: 'tenant_default', slug },
      });
    } catch {
      // ignore if tables unavailable
    }
    await prisma.$disconnect();
  });

  function enableStorefrontFlags() {
    process.env.FEATURE_STOREFRONT_BUILDER = 'true';
    process.env.FEATURE_STOREFRONT_PUBLIC_API = 'true';
    delete process.env.STOREFRONT_BUILDER_ENABLED;
    delete process.env.STOREFRONT_PUBLIC_API_ENABLED;
  }

  function disableStorefrontFlags() {
    process.env.FEATURE_STOREFRONT_BUILDER = 'false';
    process.env.FEATURE_STOREFRONT_PUBLIC_API = 'false';
    delete process.env.STOREFRONT_BUILDER_ENABLED;
    delete process.env.STOREFRONT_PUBLIC_API_ENABLED;
  }

  it('documents locked constants: preview TTL 15m + public rate limit 60/min/IP', () => {
    expect(PREVIEW_TOKEN_TTL_MS).toBe(15 * 60 * 1000);
    // Appendix G / Birth metrics: 60 req/min/IP (in-memory)
    expect(STOREFRONT_PUBLIC_RATE_LIMIT_MAX_DEFAULT).toBe(60);
  });

  it('flag off → admin website and public storefront remain gated', async () => {
    disableStorefrontFlags();

    const adminRes = await request(app).get('/api/website/projects').set(headers);
    expect(adminRes.status).toBe(403);
    expect(adminRes.body.status).toBe('gated');
    expect(adminRes.body.error.code).toBe('WEBSITE_DISABLED');

    const publicRes = await request(app).get(`/api/storefront/${slug}`);
    expect(publicRes.status).toBe(403);
    expect(publicRes.body.status).toBe('gated');
    expect(publicRes.body.error.code).toBe('STOREFRONT_PUBLIC_DISABLED');
  });

  it('Birth loop: create → build → preview :4177 → QA gate → publish → live → pages + TTL + rate limit', async () => {
    enableStorefrontFlags();
    resetStorefrontRateLimitForTests();

    const createRes = await request(app)
      .post('/api/website/projects')
      .set(headers)
      .send({
        slug,
        brief: {
          prompt: 'Birth Gate handmade ceramics storefront proof',
          localeDefault: 'nl-NL',
          brand: { name: 'Birth Atelier', primaryColor: '#3D2B1F', accentColor: '#C4A484' },
        },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.project).toMatchObject({
      slug,
      tenantId: 'tenant_default',
      status: 'draft',
    });
    const projectId = createRes.body.project.id as string;
    const revisionId = createRes.body.revision.id as string;
    expect(projectId).toBeTruthy();
    expect(revisionId).toBeTruthy();

    const buildRes = await request(app)
      .post(`/api/website/revisions/${revisionId}/build`)
      .set(headers);
    expect(buildRes.status).toBe(202);
    expect(buildRes.body.buildJob.status).toBe('succeeded');
    expect(buildRes.body.buildJob.id).toBeTruthy();
    expect(typeof buildRes.body.buildJob.previewUrl).toBe('string');
    expect(buildRes.body.buildJob.previewUrl).toMatch(/localhost:4177/);

    const previewRes = await request(app)
      .get(`/api/website/preview/${revisionId}`)
      .set(headers);
    expect(previewRes.status).toBe(200);
    expect(typeof previewRes.body.previewUrl).toBe('string');
    expect(previewRes.body.previewUrl).toMatch(/localhost:4177/);

    // Expired preview token → rejected (TTL 15 minutes locked)
    const expiredToken = signPreviewToken({
      revisionId,
      projectId,
      tenantId: 'tenant_default',
      exp: Date.now() - 1,
    });
    const expiredRes = await request(app)
      .get(`/api/storefront/${slug}/pages?path=/`)
      .set('Authorization', `Preview ${expiredToken}`);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.error.code).toBe('PREVIEW_TOKEN_EXPIRED');
    expect(expiredRes.body.page).toBeUndefined();

    // qaScore < 0.80 → propose publish blocked
    await prisma.siteRevision.update({
      where: { id: revisionId },
      data: {
        qaReportJson: {
          status: 'failed',
          score: 0.5,
          checks: [{ id: 'birth_gate_low_qa', ok: false, detail: 'forced below threshold' }],
        },
      },
    });

    const lowQaPublish = await request(app)
      .post(`/api/website/revisions/${revisionId}/publish`)
      .set(headers);
    expect(lowQaPublish.status).toBe(422);
    expect(lowQaPublish.body.error.code).toBe('QA_BELOW_THRESHOLD');
    expect(lowQaPublish.body.error.details).toMatchObject({
      qaScore: 0.5,
      threshold: 0.8,
    });

    // Restore qaScore ≥ 0.80 so propose publish can proceed
    await prisma.siteRevision.update({
      where: { id: revisionId },
      data: {
        qaReportJson: {
          status: 'passed',
          score: 0.9,
          checks: [{ id: 'birth_gate_restored', ok: true, detail: 'score restored for publish' }],
        },
      },
    });

    const publishRes = await request(app)
      .post(`/api/website/revisions/${revisionId}/publish`)
      .set(headers);
    expect(publishRes.status).toBe(201);
    expect(publishRes.body.approval).toMatchObject({
      type: 'PUBLISH_STOREFRONT',
      status: 'pending',
    });
    const approvalId = publishRes.body.approval.id as string;
    expect(approvalId).toBeTruthy();

    const beforeApprove = await prisma.siteProject.findUnique({ where: { id: projectId } });
    expect(beforeApprove?.status).not.toBe('live');
    expect(beforeApprove?.liveRevisionId).toBeNull();

    const resolveRes = await request(app)
      .post(`/api/approvals/${approvalId}/resolve`)
      .set(headers)
      .send({ approve: true });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);

    const afterApprove = await prisma.siteProject.findUnique({ where: { id: projectId } });
    expect(afterApprove?.status).toBe('live');
    expect(afterApprove?.liveRevisionId).toBe(revisionId);

    const pageRes = await request(app).get(`/api/storefront/${slug}/pages?path=/`);
    expect(pageRes.status).toBe(200);
    expect(pageRes.body.page).toMatchObject({
      path: '/',
      title: 'Home',
    });
    expect(pageRes.body.page.treeJson).toBeTruthy();
    expect(typeof pageRes.body.page.treeJson).toBe('object');

    // Rate limit: locked default is 60/min/IP; burst with lowered max proves middleware
    process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX = '3';
    resetStorefrontRateLimitForTests();
    try {
      for (let i = 0; i < 3; i++) {
        const ok = await request(app).get(`/api/storefront/${slug}`);
        expect(ok.status).toBe(200);
      }
      const limited = await request(app).get(`/api/storefront/${slug}`);
      expect(limited.status).toBe(429);
      expect(limited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    } finally {
      if (prevRateLimitMax === undefined) delete process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX;
      else process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX = prevRateLimitMax;
      resetStorefrontRateLimitForTests();
    }
  });
});
