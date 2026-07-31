import express from 'express';
import request from 'supertest';
import storefrontRouter from '../api/storefrontRouter';
import { SiteProject } from '../domain/entities/SiteProject';
import { SiteRevision } from '../domain/entities/SiteRevision';
import { SitePage } from '../domain/entities/SitePage';
import {
  PREVIEW_TOKEN_TTL_MS,
  signPreviewToken,
} from '../application/services/previewToken';
import {
  STOREFRONT_PUBLIC_RATE_LIMIT_MAX_DEFAULT,
  resetStorefrontRateLimitForTests,
} from '../api/storefrontRateLimit';

const liveProject = new SiteProject(
  'proj_a',
  'tenant_a',
  'atelier-noord',
  null,
  'live',
  'rev_live',
  new Date('2026-07-26T08:00:00.000Z'),
  new Date('2026-07-26T08:00:00.000Z')
);

const otherProject = new SiteProject(
  'proj_b',
  'tenant_b',
  'other-shop',
  null,
  'live',
  'rev_b',
  new Date('2026-07-26T08:00:00.000Z'),
  new Date('2026-07-26T08:00:00.000Z')
);

const liveRevision = new SiteRevision(
  'rev_live',
  'proj_a',
  2,
  {
    locales: ['nl-NL'],
    brand: { primaryColor: '#3D2B1F', accentColor: '#C4A484' },
  },
  {},
  '/tmp/storefront-artifacts/revisions/rev_live',
  null,
  null,
  null,
  new Date('2026-07-26T09:00:00.000Z')
);

const draftRevision = new SiteRevision(
  'rev_draft',
  'proj_a',
  3,
  { locales: ['nl-NL'], brand: { primaryColor: '#111111' } },
  {},
  null,
  null,
  null,
  null,
  new Date('2026-07-26T10:00:00.000Z')
);

const livePage = new SitePage(
  'page_about',
  'rev_live',
  '/about',
  'Over ons',
  { title: 'About' },
  { type: 'Page', children: [] },
  1,
  new Date(),
  new Date()
);

const draftPage = new SitePage(
  'page_about_draft',
  'rev_draft',
  '/about',
  'Over ons (draft)',
  { title: 'About draft' },
  { type: 'Page', children: [{ type: 'Hero' }] },
  1,
  new Date(),
  new Date()
);

const otherPage = new SitePage(
  'page_other',
  'rev_b',
  '/about',
  'Other tenant about',
  {},
  {},
  0,
  new Date(),
  new Date()
);

const resolveStorefrontSite = { execute: jest.fn() };
const getStorefrontCatalog = { execute: jest.fn() };
const getStorefrontProduct = { execute: jest.fn() };
const getStorefrontPage = { execute: jest.fn() };

const siteRepository = {
  findProjectByPublicSlug: jest.fn(),
  findRevisionById: jest.fn(),
  findPageByPath: jest.fn(),
};

const storefrontCatalog = {
  listProducts: jest.fn(),
  getProductBySlug: jest.fn(),
  getProductById: jest.fn(),
  decrementStock: jest.fn(),
};

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    resolveStorefrontSite,
    getStorefrontCatalog,
    getStorefrontProduct,
    getStorefrontPage,
    siteRepository,
    storefrontCatalog,
  }),
}));

jest.mock('../../../shared/prisma/client', () => ({
  prisma: {
    tenantFeature: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

import { featureGate } from '../../../shared/features/featureFlags';
import { ResolveStorefrontSiteUseCase } from '../application/use-cases/ResolveStorefrontSiteUseCase';
import { GetStorefrontPageUseCase } from '../application/use-cases/GetStorefrontPageUseCase';
import { GetStorefrontCatalogUseCase } from '../application/use-cases/GetStorefrontCatalogUseCase';
import { isPublicStorefrontPath } from '../../../shared/security/auth';

function createTestApp(opts: { flagOn?: boolean } = {}) {
  if (opts.flagOn === false) {
    process.env.STOREFRONT_PUBLIC_API_ENABLED = 'false';
    delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
  } else {
    process.env.STOREFRONT_PUBLIC_API_ENABLED = 'true';
    delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
  }

  const app = express();
  app.use(express.json());
  // Mirror createApp: public storefront before auth, feature-gated.
  app.use('/api/storefront', featureGate('storefront-public-api'), storefrontRouter);
  return app;
}

describe('Public Storefront API /api/storefront', () => {
  const prevAlias = process.env.STOREFRONT_PUBLIC_API_ENABLED;
  const prevFeature = process.env.FEATURE_STOREFRONT_PUBLIC_API;
  const prevSecret = process.env.STOREFRONT_PREVIEW_HMAC_SECRET;

  beforeAll(() => {
    process.env.STOREFRONT_PREVIEW_HMAC_SECRET = 'test-storefront-preview-hmac-secret';
  });

  afterAll(() => {
    if (prevAlias === undefined) delete process.env.STOREFRONT_PUBLIC_API_ENABLED;
    else process.env.STOREFRONT_PUBLIC_API_ENABLED = prevAlias;
    if (prevFeature === undefined) delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
    else process.env.FEATURE_STOREFRONT_PUBLIC_API = prevFeature;
    if (prevSecret === undefined) delete process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
    else process.env.STOREFRONT_PREVIEW_HMAC_SECRET = prevSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetStorefrontRateLimitForTests();
    resolveStorefrontSite.execute.mockImplementation(async (slug: string, auth?: string) => {
      const uc = new ResolveStorefrontSiteUseCase(siteRepository as never);
      return uc.execute(slug, auth);
    });
    getStorefrontPage.execute.mockImplementation(
      async (slug: string, path: string, auth?: string) => {
        const uc = new GetStorefrontPageUseCase(siteRepository as never);
        return uc.execute(slug, path, auth);
      }
    );
    getStorefrontCatalog.execute.mockImplementation(
      async (slug: string, opts?: { limit?: number; cursor?: string | null }) => {
        const uc = new GetStorefrontCatalogUseCase(
          siteRepository as never,
          storefrontCatalog as never
        );
        return uc.execute(slug, opts);
      }
    );
    getStorefrontProduct.execute.mockResolvedValue({
      id: 'prod_1',
      slug: 'kom-aarde',
      name: 'Kom Aarde',
      description: 'Handmade',
      price: 42,
      currency: 'EUR',
      stock: 12,
      imageUrl: null,
      variants: [],
    });

    siteRepository.findProjectByPublicSlug.mockImplementation(async (slug: string) => {
      if (slug === 'atelier-noord') return liveProject;
      if (slug === 'other-shop') return otherProject;
      return null;
    });
    siteRepository.findRevisionById.mockImplementation(
      async (tenantId: string, revisionId: string) => {
        if (tenantId === 'tenant_a' && revisionId === 'rev_live') return liveRevision;
        if (tenantId === 'tenant_a' && revisionId === 'rev_draft') return draftRevision;
        if (tenantId === 'tenant_b' && revisionId === 'rev_b') {
          return new SiteRevision(
            'rev_b',
            'proj_b',
            1,
            {},
            {},
            null,
            null,
            null,
            null,
            new Date()
          );
        }
        return null;
      }
    );
    siteRepository.findPageByPath.mockImplementation(
      async (tenantId: string, revisionId: string, path: string) => {
        if (tenantId === 'tenant_a' && revisionId === 'rev_live' && path === '/about') {
          return livePage;
        }
        if (tenantId === 'tenant_a' && revisionId === 'rev_draft' && path === '/about') {
          return draftPage;
        }
        if (tenantId === 'tenant_b' && revisionId === 'rev_b' && path === '/about') {
          return otherPage;
        }
        return null;
      }
    );
    storefrontCatalog.listProducts.mockResolvedValue({
      products: [
        {
          id: 'prod_1',
          slug: 'kom-aarde',
          name: 'Kom Aarde',
          description: 'Handmade',
          price: 42,
          currency: 'EUR',
          stock: 12,
          imageUrl: null,
        },
      ],
      nextCursor: null,
    });
  });

  it('flag off → 403 STOREFRONT_PUBLIC_DISABLED', async () => {
    const res = await request(createTestApp({ flagOn: false })).get(
      '/api/storefront/atelier-noord'
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('STOREFRONT_PUBLIC_DISABLED');
  });

  it('live happy path: resolve site + page from liveRevisionId (no API key)', async () => {
    const siteRes = await request(createTestApp()).get('/api/storefront/atelier-noord');
    expect(siteRes.status).toBe(200);
    expect(siteRes.body.site).toMatchObject({
      slug: 'atelier-noord',
      status: 'live',
      revisionId: 'rev_live',
      locales: ['nl-NL'],
      tokens: { primary: '#3D2B1F', accent: '#C4A484' },
    });

    const pageRes = await request(createTestApp()).get(
      '/api/storefront/atelier-noord/pages?path=/about'
    );
    expect(pageRes.status).toBe(200);
    expect(pageRes.body.page).toMatchObject({
      id: 'page_about',
      path: '/about',
      title: 'Over ons',
    });

    const catalogRes = await request(createTestApp()).get(
      '/api/storefront/atelier-noord/catalog'
    );
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.products).toHaveLength(1);
    expect(catalogRes.body.products[0].slug).toBe('kom-aarde');
  });

  it('public responses never leak admin fields (brief/plan/api keys)', async () => {
    const siteRes = await request(createTestApp()).get('/api/storefront/atelier-noord');
    expect(siteRes.status).toBe(200);
    const leakedKeys = [
      'briefJson',
      'planJson',
      'createdByAgent',
      'apiKey',
      'AETHER_API_KEY',
      'primaryDomain',
      'deployTarget',
      'qaReportJson',
    ];
    for (const key of leakedKeys) {
      expect(siteRes.body.site).not.toHaveProperty(key);
      expect(JSON.stringify(siteRes.body)).not.toContain(key);
    }

    const pageRes = await request(createTestApp()).get(
      '/api/storefront/atelier-noord/pages?path=/about'
    );
    expect(pageRes.body.page).not.toHaveProperty('briefJson');
    expect(pageRes.body.page).not.toHaveProperty('createdByAgent');
  });

  it('unknown slug → 404 SITE_NOT_FOUND', async () => {
    const res = await request(createTestApp()).get('/api/storefront/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SITE_NOT_FOUND');
  });

  it('status=live without liveRevisionId → 404 SITE_NOT_FOUND (corrupt pointer fail-closed)', async () => {
    siteRepository.findProjectByPublicSlug.mockResolvedValue(
      new SiteProject(
        'proj_corrupt',
        'tenant_a',
        'atelier-noord',
        null,
        'live',
        null,
        new Date(),
        new Date()
      )
    );
    const res = await request(createTestApp()).get('/api/storefront/atelier-noord');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SITE_NOT_FOUND');
  });

  it('liveRevisionId set but revision missing → 404 SITE_NOT_FOUND (dangling pointer)', async () => {
    siteRepository.findRevisionById.mockResolvedValue(null);
    const res = await request(createTestApp()).get('/api/storefront/atelier-noord');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SITE_NOT_FOUND');
  });

  it('live revision without artifactsPath → 404 SITE_NOT_FOUND (dead-man fail-closed)', async () => {
    siteRepository.findRevisionById.mockResolvedValue(
      new SiteRevision(
        'rev_live',
        'proj_a',
        2,
        { locales: ['nl-NL'] },
        {},
        null,
        null,
        null,
        null,
        new Date()
      )
    );
    const res = await request(createTestApp()).get('/api/storefront/atelier-noord');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SITE_NOT_FOUND');
  });

  it('invalid / traversal slug → 404 SITE_NOT_FOUND (fail-closed)', async () => {
    const cases = ['..evil', '-leading', 'Bad_Case', 'has..dots', 'a'.repeat(64)];
    for (const slug of cases) {
      const res = await request(createTestApp()).get(`/api/storefront/${encodeURIComponent(slug)}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SITE_NOT_FOUND');
      expect(siteRepository.findProjectByPublicSlug).not.toHaveBeenCalled();
      siteRepository.findProjectByPublicSlug.mockClear();
    }
  });

  it('preview token success: serves draft revision page', async () => {
    const token = signPreviewToken({
      revisionId: 'rev_draft',
      projectId: 'proj_a',
      tenantId: 'tenant_a',
    });

    const res = await request(createTestApp())
      .get('/api/storefront/atelier-noord/pages?path=/about')
      .set('Authorization', `Preview ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.page.id).toBe('page_about_draft');
    expect(res.body.page.title).toBe('Over ons (draft)');
  });

  it('preview token fail: wrong signature → 401', async () => {
    const res = await request(createTestApp())
      .get('/api/storefront/atelier-noord/pages?path=/about')
      .set('Authorization', 'Preview notavalid.tokenpayloadsig');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('PREVIEW_TOKEN_INVALID');
  });

  it('preview token expired (TTL 15m default) → 401 PREVIEW_TOKEN_EXPIRED', async () => {
    expect(PREVIEW_TOKEN_TTL_MS).toBe(15 * 60 * 1000);
    const token = signPreviewToken({
      revisionId: 'rev_draft',
      projectId: 'proj_a',
      tenantId: 'tenant_a',
      exp: Date.now() - 1,
    });

    const res = await request(createTestApp())
      .get('/api/storefront/atelier-noord/pages?path=/about')
      .set('Authorization', `Preview ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('PREVIEW_TOKEN_EXPIRED');
    expect(res.body.page).toBeUndefined();
  });

  it('rate limit: 429 RATE_LIMIT_EXCEEDED after burst (60/min/IP locked default)', async () => {
    expect(STOREFRONT_PUBLIC_RATE_LIMIT_MAX_DEFAULT).toBe(60);
    const prevMax = process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX;
    process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX = '3';
    resetStorefrontRateLimitForTests();
    try {
      const app = createTestApp();
      for (let i = 0; i < 3; i++) {
        const ok = await request(app).get('/api/storefront/atelier-noord');
        expect(ok.status).toBe(200);
      }
      const limited = await request(app).get('/api/storefront/atelier-noord');
      expect(limited.status).toBe(429);
      expect(limited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    } finally {
      if (prevMax === undefined) delete process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX;
      else process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX = prevMax;
      resetStorefrontRateLimitForTests();
    }
  });

  it('preview token fail: other tenant projectId → 401 (no leak)', async () => {
    const foreignToken = signPreviewToken({
      revisionId: 'rev_b',
      projectId: 'proj_b',
      tenantId: 'tenant_b',
    });

    const res = await request(createTestApp())
      .get('/api/storefront/atelier-noord/pages?path=/about')
      .set('Authorization', `Preview ${foreignToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('PREVIEW_TOKEN_INVALID');
    // Must not return other tenant page content
    expect(res.body.page).toBeUndefined();
  });

  it('tenant isolation: catalog only uses resolved project tenant', async () => {
    await request(createTestApp()).get('/api/storefront/atelier-noord/catalog');
    expect(storefrontCatalog.listProducts).toHaveBeenCalledWith('tenant_a', expect.anything());

    await request(createTestApp()).get('/api/storefront/other-shop/catalog');
    expect(storefrontCatalog.listProducts).toHaveBeenCalledWith('tenant_b', expect.anything());
  });

  it('isPublicStorefrontPath allows GET /api/storefront/* without API key', () => {
    expect(
      isPublicStorefrontPath({
        method: 'GET',
        path: '/api/storefront/atelier-noord',
        originalUrl: '/api/storefront/atelier-noord',
      } as never)
    ).toBe(true);
    expect(
      isPublicStorefrontPath({
        method: 'POST',
        path: '/api/storefront/atelier-noord',
        originalUrl: '/api/storefront/atelier-noord',
      } as never)
    ).toBe(false);
  });

  it('isPublicStorefrontPath allows cart/checkout mutations without API key', () => {
    expect(
      isPublicStorefrontPath({
        method: 'POST',
        path: '/api/storefront/atelier-noord/carts',
        originalUrl: '/api/storefront/atelier-noord/carts',
      } as never)
    ).toBe(true);
    expect(
      isPublicStorefrontPath({
        method: 'PATCH',
        path: '/api/storefront/atelier-noord/carts/c1/items/i1',
        originalUrl: '/api/storefront/atelier-noord/carts/c1/items/i1',
      } as never)
    ).toBe(true);
    expect(
      isPublicStorefrontPath({
        method: 'POST',
        path: '/api/storefront/atelier-noord/checkout',
        originalUrl: '/api/storefront/atelier-noord/checkout',
      } as never)
    ).toBe(true);
  });
});
