import {
  signPreviewToken,
  verifyPreviewToken,
  extractPreviewTokenFromAuthHeader,
  PreviewTokenError,
  PREVIEW_TOKEN_TTL_MS,
} from '../application/services/previewToken';

describe('previewToken sign/verify', () => {
  const secret = 'unit-test-preview-secret';
  const baseClaims = {
    revisionId: 'rev_1',
    projectId: 'proj_1',
    tenantId: 'tenant_a',
  };

  it('locks default TTL to 15 minutes (Appendix G)', () => {
    expect(PREVIEW_TOKEN_TTL_MS).toBe(15 * 60 * 1000);
    const token = signPreviewToken(baseClaims, { secret, nowMs: 1_000_000 });
    const claims = verifyPreviewToken(token, { secret, nowMs: 1_000_000 });
    expect(claims.exp).toBe(1_000_000 + PREVIEW_TOKEN_TTL_MS);
  });

  it('requires STOREFRONT_PREVIEW_HMAC_SECRET outside test NODE_ENV', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
      expect(() => signPreviewToken(baseClaims)).toThrow(
        /STOREFRONT_PREVIEW_HMAC_SECRET is required/
      );
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevSecret === undefined) delete process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
      else process.env.STOREFRONT_PREVIEW_HMAC_SECRET = prevSecret;
    }
  });

  it('round-trips a valid token', () => {
    const token = signPreviewToken(baseClaims, { secret, nowMs: 1_000_000, ttlMs: 60_000 });
    const claims = verifyPreviewToken(token, { secret, nowMs: 1_010_000 });
    expect(claims).toMatchObject(baseClaims);
    expect(claims.exp).toBe(1_060_000);
  });

  it('rejects tampered signature', () => {
    const token = signPreviewToken(baseClaims, { secret, nowMs: 1_000_000 });
    const [payload] = token.split('.');
    expect(() =>
      verifyPreviewToken(`${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`, {
        secret,
        nowMs: 1_000_000,
      })
    ).toThrow(PreviewTokenError);
  });

  it('rejects expired token', () => {
    const token = signPreviewToken(baseClaims, { secret, nowMs: 1_000_000, ttlMs: 1_000 });
    expect(() => verifyPreviewToken(token, { secret, nowMs: 1_002_000 })).toThrow(
      PreviewTokenError
    );
    try {
      verifyPreviewToken(token, { secret, nowMs: 1_002_000 });
    } catch (err) {
      expect((err as PreviewTokenError).code).toBe('PREVIEW_TOKEN_EXPIRED');
    }
  });

  it('extracts Authorization: Preview <token>', () => {
    expect(extractPreviewTokenFromAuthHeader('Preview abc.def')).toBe('abc.def');
    expect(extractPreviewTokenFromAuthHeader('Bearer x')).toBeNull();
    expect(extractPreviewTokenFromAuthHeader(undefined)).toBeNull();
  });
});
