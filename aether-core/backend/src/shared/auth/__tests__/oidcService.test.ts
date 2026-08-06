import {
  isOidcEnabled,
  generateStateToken,
  generateNonce,
  clearOidcConfigurationCache,
} from '../oidcService';

describe('oidcService', () => {
  const originalEnabled = process.env.SSO_OIDC_ENABLED;

  beforeEach(() => {
    clearOidcConfigurationCache();
    delete process.env.SSO_OIDC_ENABLED;
  });

  afterAll(() => {
    if (originalEnabled === undefined) {
      delete process.env.SSO_OIDC_ENABLED;
    } else {
      process.env.SSO_OIDC_ENABLED = originalEnabled;
    }
  });

  describe('isOidcEnabled', () => {
    it('returns false when SSO_OIDC_ENABLED is not set', () => {
      expect(isOidcEnabled()).toBe(false);
    });

    it('returns false when SSO_OIDC_ENABLED is false', () => {
      process.env.SSO_OIDC_ENABLED = 'false';
      expect(isOidcEnabled()).toBe(false);
    });

    it('returns true when SSO_OIDC_ENABLED is true', () => {
      process.env.SSO_OIDC_ENABLED = 'true';
      expect(isOidcEnabled()).toBe(true);
    });
  });

  describe('generateStateToken', () => {
    it('generates a state token', () => {
      const state = generateStateToken();
      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(10);
    });

    it('generates unique tokens', () => {
      const state1 = generateStateToken();
      const state2 = generateStateToken();
      expect(state1).not.toBe(state2);
    });
  });

  describe('generateNonce', () => {
    it('generates a nonce', () => {
      const nonce = generateNonce();
      expect(nonce).toBeTruthy();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(10);
    });

    it('generates unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });
});
