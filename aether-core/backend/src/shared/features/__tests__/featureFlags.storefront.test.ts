import { isFeatureEnabled, featureGate } from '../featureFlags';

jest.mock('../../prisma/client', () => ({
  prisma: {
    tenantFeature: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

describe('storefront-builder feature flag', () => {
  const prevFeature = process.env.FEATURE_STOREFRONT_BUILDER;
  const prevAlias = process.env.STOREFRONT_BUILDER_ENABLED;

  afterEach(() => {
    if (prevFeature === undefined) delete process.env.FEATURE_STOREFRONT_BUILDER;
    else process.env.FEATURE_STOREFRONT_BUILDER = prevFeature;
    if (prevAlias === undefined) delete process.env.STOREFRONT_BUILDER_ENABLED;
    else process.env.STOREFRONT_BUILDER_ENABLED = prevAlias;
  });

  it('defaults to false', async () => {
    delete process.env.FEATURE_STOREFRONT_BUILDER;
    delete process.env.STOREFRONT_BUILDER_ENABLED;
    await expect(isFeatureEnabled('tenant_a', 'storefront-builder')).resolves.toBe(false);
  });

  it('honors FEATURE_STOREFRONT_BUILDER', async () => {
    delete process.env.STOREFRONT_BUILDER_ENABLED;
    process.env.FEATURE_STOREFRONT_BUILDER = 'true';
    await expect(isFeatureEnabled('tenant_a', 'storefront-builder')).resolves.toBe(true);
  });

  it('honors STOREFRONT_BUILDER_ENABLED alias', async () => {
    delete process.env.FEATURE_STOREFRONT_BUILDER;
    process.env.STOREFRONT_BUILDER_ENABLED = 'true';
    await expect(isFeatureEnabled('tenant_a', 'storefront-builder')).resolves.toBe(true);
  });

  it('featureGate returns WEBSITE_DISABLED when off', async () => {
    delete process.env.FEATURE_STOREFRONT_BUILDER;
    delete process.env.STOREFRONT_BUILDER_ENABLED;

    const middleware = featureGate('storefront-builder');
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();

    await middleware(
      { tenantId: 'tenant_a' } as never,
      { status } as never,
      next
    );

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'WEBSITE_DISABLED', message: "Feature 'storefront-builder' is disabled" },
      status: 'gated',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('storefront deploy env default', () => {
  it('STOREFRONT_DEPLOY_ENABLED defaults off (safe)', () => {
    const prev = process.env.STOREFRONT_DEPLOY_ENABLED;
    delete process.env.STOREFRONT_DEPLOY_ENABLED;
    expect(process.env.STOREFRONT_DEPLOY_ENABLED === 'true').toBe(false);
    if (prev !== undefined) process.env.STOREFRONT_DEPLOY_ENABLED = prev;
  });
});

describe('storefront-public-api feature flag', () => {
  const prevFeature = process.env.FEATURE_STOREFRONT_PUBLIC_API;
  const prevAlias = process.env.STOREFRONT_PUBLIC_API_ENABLED;

  afterEach(() => {
    if (prevFeature === undefined) delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
    else process.env.FEATURE_STOREFRONT_PUBLIC_API = prevFeature;
    if (prevAlias === undefined) delete process.env.STOREFRONT_PUBLIC_API_ENABLED;
    else process.env.STOREFRONT_PUBLIC_API_ENABLED = prevAlias;
  });

  it('defaults to false', async () => {
    delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
    delete process.env.STOREFRONT_PUBLIC_API_ENABLED;
    await expect(isFeatureEnabled('tenant_a', 'storefront-public-api')).resolves.toBe(false);
  });

  it('honors STOREFRONT_PUBLIC_API_ENABLED alias', async () => {
    delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
    process.env.STOREFRONT_PUBLIC_API_ENABLED = 'true';
    await expect(isFeatureEnabled('tenant_a', 'storefront-public-api')).resolves.toBe(true);
  });

  it('featureGate returns STOREFRONT_PUBLIC_DISABLED when off', async () => {
    delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
    delete process.env.STOREFRONT_PUBLIC_API_ENABLED;

    const middleware = featureGate('storefront-public-api');
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();

    await middleware(
      { tenantId: 'tenant_a' } as never,
      { status } as never,
      next
    );

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'STOREFRONT_PUBLIC_DISABLED',
        message: "Feature 'storefront-public-api' is disabled",
      },
      status: 'gated',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
