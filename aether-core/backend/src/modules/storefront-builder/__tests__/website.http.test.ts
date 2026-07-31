import express from 'express';
import request from 'supertest';
import websiteRouter from '../api/websiteRouter';
import { SiteProject } from '../domain/entities/SiteProject';
import { SiteRevision } from '../domain/entities/SiteRevision';
import { BuildJob } from '../domain/entities/BuildJob';
import { DuplicateSiteSlugError } from '../application/use-cases/CreateSiteProjectUseCase';
import { QaBelowThresholdError } from '../application/use-cases/ProposePublishUseCase';
import { CodegenRejectedError } from '../infrastructure/codegen/CodegenRejectedError';

const project = new SiteProject(
  'proj_1',
  'tenant_a',
  'atelier-noord',
  null,
  'draft',
  null,
  new Date('2026-07-26T08:00:00.000Z'),
  new Date('2026-07-26T08:00:00.000Z')
);

const revision = new SiteRevision(
  'rev_1',
  'proj_1',
  1,
  { prompt: 'Handmade keramiek' },
  {},
  null,
  { score: 0.92 },
  null,
  null,
  new Date('2026-07-26T08:00:00.000Z')
);

const buildJob = new BuildJob(
  'build_1',
  'rev_1',
  'queued',
  null,
  null,
  null,
  null,
  new Date('2026-07-26T08:00:00.000Z')
);

const createSiteProject = { execute: jest.fn() };
const getSiteProject = { execute: jest.fn() };
const listSiteProjects = { execute: jest.fn() };
const createSiteRevision = { execute: jest.fn() };
const listSiteRevisions = { execute: jest.fn() };
const getSiteRevision = { execute: jest.fn() };
const listSitePages = { execute: jest.fn() };
const getSitePage = { execute: jest.fn() };
const startSiteBuild = { execute: jest.fn() };
const getSiteBuildJob = { execute: jest.fn() };
const proposeSitePublish = { execute: jest.fn() };
const getSiteDeployTarget = { execute: jest.fn() };
const upsertSiteDeployTarget = { execute: jest.fn() };
const getSitePreviewUrl = { execute: jest.fn() };

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    createSiteProject,
    getSiteProject,
    listSiteProjects,
    createSiteRevision,
    listSiteRevisions,
    getSiteRevision,
    listSitePages,
    getSitePage,
    startSiteBuild,
    getSiteBuildJob,
    proposeSitePublish,
    getSiteDeployTarget,
    upsertSiteDeployTarget,
    getSitePreviewUrl,
    siteRepository: {},
  }),
}));

jest.mock('../../../shared/security/rbac', () => ({
  requireViewer: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.tenantId = req.tenantId ?? 'tenant_a';
    req.actorId = 'actor_1';
    next();
  },
  requireOperator: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.tenantId = req.tenantId ?? 'tenant_a';
    req.actorId = 'actor_1';
    next();
  },
}));

jest.mock('../../../shared/prisma/client', () => ({
  prisma: {
    tenantFeature: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

import { featureGate } from '../../../shared/features/featureFlags';

function createTestApp(opts: { flagOn?: boolean; tenantId?: string } = {}) {
  if (opts.flagOn === false) {
    process.env.STOREFRONT_BUILDER_ENABLED = 'false';
    delete process.env.FEATURE_STOREFRONT_BUILDER;
  } else {
    process.env.STOREFRONT_BUILDER_ENABLED = 'true';
    delete process.env.FEATURE_STOREFRONT_BUILDER;
  }

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.tenantId = opts.tenantId ?? 'tenant_a';
    next();
  });
  app.use('/api/website', featureGate('storefront-builder'), websiteRouter);
  return app;
}

describe('Admin Website API /api/website', () => {
  const prevAlias = process.env.STOREFRONT_BUILDER_ENABLED;
  const prevFeature = process.env.FEATURE_STOREFRONT_BUILDER;

  afterAll(() => {
    if (prevAlias === undefined) delete process.env.STOREFRONT_BUILDER_ENABLED;
    else process.env.STOREFRONT_BUILDER_ENABLED = prevAlias;
    if (prevFeature === undefined) delete process.env.FEATURE_STOREFRONT_BUILDER;
    else process.env.FEATURE_STOREFRONT_BUILDER = prevFeature;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createSiteProject.execute.mockResolvedValue({ project, revision, buildJob });
    getSiteProject.execute.mockResolvedValue(project);
    listSiteProjects.execute.mockResolvedValue([project]);
    listSiteRevisions.execute.mockResolvedValue([revision]);
    getSiteRevision.execute.mockResolvedValue(revision);
    listSitePages.execute.mockResolvedValue([]);
    getSitePreviewUrl.execute.mockResolvedValue({
      previewUrl: 'http://localhost:4177/preview/rev_1?token=stub',
      expiresAt: '2026-07-26T10:00:00.000Z',
    });
    proposeSitePublish.execute.mockResolvedValue({
      approval: {
        id: 'appr_1',
        type: 'PUBLISH_STOREFRONT',
        status: 'pending',
        payload: { projectId: 'proj_1', revisionId: 'rev_1', qaScore: 0.92 },
      },
    });
  });

  it('flag off → 403 WEBSITE_DISABLED / gated', async () => {
    const res = await request(createTestApp({ flagOn: false })).get('/api/website/projects');
    expect(res.status).toBe(403);
    expect(res.body.status).toBe('gated');
    expect(res.body.error.code).toBe('WEBSITE_DISABLED');
  });

  it('POST /projects returns 201 contract shape', async () => {
    const res = await request(createTestApp())
      .post('/api/website/projects')
      .send({
        slug: 'atelier-noord',
        brief: { prompt: 'Handmade keramiek, rustiek, Nederlands' },
      });

    expect(res.status).toBe(201);
    expect(res.body.project).toMatchObject({
      id: 'proj_1',
      tenantId: 'tenant_a',
      slug: 'atelier-noord',
      status: 'draft',
    });
    expect(res.body.revision).toMatchObject({
      id: 'rev_1',
      version: 1,
      status: 'generating',
    });
    expect(res.body.buildJob).toMatchObject({
      id: 'build_1',
      status: 'queued',
    });
    expect(createSiteProject.execute).toHaveBeenCalledWith(
      'tenant_a',
      expect.objectContaining({ slug: 'atelier-noord' })
    );
  });

  it('cross-tenant GET returns 404 PROJECT_NOT_FOUND', async () => {
    getSiteProject.execute.mockResolvedValue(null);
    const res = await request(createTestApp({ tenantId: 'tenant_b' })).get(
      '/api/website/projects/proj_1'
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('publish creates pending approval and does not set status=live', async () => {
    const res = await request(createTestApp()).post('/api/website/revisions/rev_1/publish');

    expect(res.status).toBe(201);
    expect(res.body.approval).toMatchObject({
      id: 'appr_1',
      type: 'PUBLISH_STOREFRONT',
      status: 'pending',
      payload: {
        projectId: 'proj_1',
        revisionId: 'rev_1',
        qaScore: 0.92,
      },
    });
    expect(proposeSitePublish.execute).toHaveBeenCalledWith('tenant_a', 'rev_1', {
      requestedBy: 'actor_1',
    });
    expect(project.status).toBe('draft');
    expect(project.status).not.toBe('live');
  });

  it('SLUG_TAKEN on duplicate create', async () => {
    createSiteProject.execute.mockRejectedValue(new DuplicateSiteSlugError('atelier-noord'));

    const res = await request(createTestApp())
      .post('/api/website/projects')
      .send({ slug: 'atelier-noord', brief: {} });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLUG_TAKEN');
  });

  it('REVISION_NOT_READY when plan.generating is true', async () => {
    getSiteRevision.execute.mockResolvedValue(
      new SiteRevision(
        'rev_gen',
        'proj_1',
        2,
        {},
        { generating: true },
        null,
        null,
        null,
        null,
        new Date()
      )
    );

    const res = await request(createTestApp()).post('/api/website/revisions/rev_gen/publish');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REVISION_NOT_READY');
    expect(proposeSitePublish.execute).not.toHaveBeenCalled();
  });

  it('CODEGEN_REJECTED on create when allowlist compiler rejects', async () => {
    createSiteProject.execute.mockRejectedValue(
      new CodegenRejectedError('overrides/*.tsx rejected in v1', {
        reason: 'TSX_OVERRIDES_FORBIDDEN',
      })
    );

    const res = await request(createTestApp())
      .post('/api/website/projects')
      .send({ slug: 'bad-overrides', brief: { prompt: 'with illegal overrides' } });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CODEGEN_REJECTED');
    expect(res.body.error.details).toEqual({ reason: 'TSX_OVERRIDES_FORBIDDEN' });
  });

  it('QA_BELOW_THRESHOLD when propose publish score < 0.80', async () => {
    proposeSitePublish.execute.mockRejectedValue(new QaBelowThresholdError(0.5));

    const res = await request(createTestApp()).post('/api/website/revisions/rev_1/publish');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('QA_BELOW_THRESHOLD');
    expect(res.body.error.details).toMatchObject({ qaScore: 0.5, threshold: 0.8 });
  });
});
