import {
  getObservabilityStatus,
  isObservabilityProbeAllowed,
} from '../observabilityProbe';

describe('observabilityProbe', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isObservabilityProbeAllowed', () => {
    it('blocks probes in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.OBSERVABILITY_PROBE_ENABLED = 'true';
      expect(isObservabilityProbeAllowed()).toBe(false);
    });

    it('allows probes in staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(isObservabilityProbeAllowed()).toBe(true);
    });

    it('allows probes when OBSERVABILITY_PROBE_ENABLED is set outside production', () => {
      process.env.NODE_ENV = 'development';
      process.env.OBSERVABILITY_PROBE_ENABLED = 'true';
      expect(isObservabilityProbeAllowed()).toBe(true);
    });
  });

  describe('getObservabilityStatus', () => {
    it('returns release and environment from env', () => {
      process.env.NODE_ENV = 'staging';
      process.env.SENTRY_ENV = 'staging';
      process.env.APP_VERSION = 'abc123';
      const status = getObservabilityStatus();
      expect(status.environment).toBe('staging');
      expect(status.release).toBe('abc123');
      expect(status.probeAllowed).toBe(true);
    });
  });
});
