/**
 * Birth Gate / P14 — Storefront vertical-slice E2E (DB-backed).
 * Prove: FEATURE_* flags → create project → build → previewUrl :4177 →
 * publish approval → executeApprovedAction (via /approvals resolve) →
 * public GET pages?path=/ returns allowlisted tree.
 * Flag-off remains gated (security case).
 *
 * Runs when CI=true (same gate as mail-approval.e2e).
 */
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../shared/prisma/client';

const describeIfDb = process.env.CI === 'true' ? describe : describe.skip;

describeIfDb('Storefront publish E2E (DB-backed)', () => {
  const app = createApp();
  const headers = {
    'X-Aether-Api-Key': process.env.AETHER_API_KEY ?? 'ci-test-key',
    'X-Aether-Tenant-Id': 'tenant_default',
    'X-Aether-Actor-Id': 'storefront-e2e',
  };

  const prevBuilder = process.env.STOREFRONT_BUILDER_ENABLED;
  const prevPublic = process.env.STOREFRONT_PUBLIC_API_ENABLED;
  const prevFeatureBuilder = process.env.FEATURE_STOREFRONT_BUILDER;
  const prevFeaturePublic = process.env.FEATURE_STOREFRONT_PUBLIC_API;
  const prevPreviewSecret = process.env.STOREFRONT_PREVIEW_HMAC_SECRET;

  let slug: string;

  beforeAll(() => {
    process.env.AETHER_API_KEY = process.env.AETHER_API_KEY ?? 'ci-test-key';
    process.env.NODE_ENV = 'test';
    process.env.STOREFRONT_PREVIEW_HMAC_SECRET =
      process.env.STOREFRONT_PREVIEW_HMAC_SECRET || 'ci-storefront-preview-hmac-secret';
    slug = `e2e-store-${Date.now().toString(36)}`;
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

    // Best-effort cleanup (cascade removes revisions/pages/builds)
    try {
      await prisma.siteProject.deleteMany({
        where: { tenantId: 'tenant_default', slug },
      });
    } catch {
      // ignore if tables unavailable
    }
    await prisma.$disconnect();
  });

  /** Birth Gate: prove FEATURE_* env keys (not only STOREFRONT_* aliases). */
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

  it('create → build → publish approval → execute → public pages?path=/', async () => {
    enableStorefrontFlags();

    const createRes = await request(app)
      .post('/api/website/projects')
      .set(headers)
      .send({
        slug,
        brief: {
          prompt: 'E2E handmade ceramics storefront proof',
          localeDefault: 'nl-NL',
          brand: { name: 'E2E Atelier', primaryColor: '#3D2B1F', accentColor: '#C4A484' },
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

    const previewRes = await request(app)
      .get(`/api/website/preview/${revisionId}`)
      .set(headers);
    expect(previewRes.status).toBe(200);
    expect(typeof previewRes.body.previewUrl).toBe('string');
    expect(previewRes.body.previewUrl).toMatch(/localhost:4177/);

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

    // Publish must not go live before approval execute
    const beforeApprove = await prisma.siteProject.findUnique({ where: { id: projectId } });
    expect(beforeApprove?.status).not.toBe('live');
    expect(beforeApprove?.liveRevisionId).toBeNull();

    // Production path: resolve → executeApprovedAction (StorefrontPublishApprovalHandler)
    const resolveRes = await request(app)
      .post(`/api/approvals/${approvalId}/resolve`)
      .set(headers)
      .send({ approve: true });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);

    const afterApprove = await prisma.siteProject.findUnique({ where: { id: projectId } });
    expect(afterApprove?.status).toBe('live');
    expect(afterApprove?.liveRevisionId).toBe(revisionId);

    const executed = await prisma.auditLog.findFirst({
      where: {
        tenantId: 'tenant_default',
        module: 'storefront-builder',
        action: 'action_executed',
        details: { contains: approvalId },
      },
    });
    expect(executed).toBeTruthy();

    const siteRes = await request(app).get(`/api/storefront/${slug}`);
    expect(siteRes.status).toBe(200);
    expect(siteRes.body.site).toMatchObject({
      slug,
      status: 'live',
      revisionId,
    });

    // Birth Gate required: home tree at path=/
    const pageRes = await request(app).get(`/api/storefront/${slug}/pages?path=/`);
    expect(pageRes.status).toBe(200);
    expect(pageRes.body.page).toMatchObject({
      path: '/',
      title: 'Home',
    });
    expect(pageRes.body.page.treeJson).toBeTruthy();
    expect(typeof pageRes.body.page.treeJson).toBe('object');
  });
});
