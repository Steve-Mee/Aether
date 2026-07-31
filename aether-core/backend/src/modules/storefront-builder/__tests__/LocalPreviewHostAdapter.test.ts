import { LocalPreviewHostAdapter } from '../infrastructure/preview/LocalPreviewHostAdapter';
import {
  verifyPreviewToken,
  PreviewTokenError,
} from '../application/services/previewToken';

describe('LocalPreviewHostAdapter', () => {
  const prevSecret = process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
  const prevPort = process.env.STOREFRONT_PREVIEW_PORT;

  beforeEach(() => {
    process.env.STOREFRONT_PREVIEW_HMAC_SECRET = 'test-storefront-preview-hmac-secret';
    process.env.STOREFRONT_PREVIEW_PORT = '3200';
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
    else process.env.STOREFRONT_PREVIEW_HMAC_SECRET = prevSecret;
    if (prevPort === undefined) delete process.env.STOREFRONT_PREVIEW_PORT;
    else process.env.STOREFRONT_PREVIEW_PORT = prevPort;
  });

  it('defaults to locked port 4177 when STOREFRONT_PREVIEW_PORT unset', async () => {
    delete process.env.STOREFRONT_PREVIEW_PORT;
    const host = new LocalPreviewHostAdapter({
      nowMs: () => 1_700_000_000_000,
      ttlMs: 60_000,
    });
    const result = await host.startPreview({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });
    expect(result.previewUrl).toMatch(
      /^http:\/\/localhost:4177\/preview\/rev_1\?token=/
    );
  });

  it('returns signed preview URL with token query param', async () => {
    const host = new LocalPreviewHostAdapter({
      nowMs: () => 1_700_000_000_000,
      ttlMs: 60_000,
    });
    const result = await host.startPreview({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });

    expect(result.previewUrl).toMatch(
      /^http:\/\/localhost:3200\/preview\/rev_1\?token=/
    );
    expect(result.expiresAt?.getTime()).toBe(1_700_000_060_000);

    const token = new URL(result.previewUrl).searchParams.get('token')!;
    const claims = verifyPreviewToken(token, {
      secret: 'test-storefront-preview-hmac-secret',
      nowMs: 1_700_000_000_000,
    });
    expect(claims.tenantId).toBe('tenant_a');
    expect(claims.projectId).toBe('proj_1');
    expect(claims.revisionId).toBe('rev_1');
  });

  it('expired token from preview URL fails verify', async () => {
    const host = new LocalPreviewHostAdapter({
      nowMs: () => 1_000_000,
      ttlMs: 1_000,
    });
    const result = await host.startPreview({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });
    const token = new URL(result.previewUrl).searchParams.get('token')!;
    expect(() =>
      verifyPreviewToken(token, {
        secret: 'test-storefront-preview-hmac-secret',
        nowMs: 1_002_000,
      })
    ).toThrow(PreviewTokenError);
  });
});
