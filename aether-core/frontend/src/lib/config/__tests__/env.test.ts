import { describe, expect, it } from 'vitest';
import {
  getRuntimeConfig,
  parseAuthProvider,
  parseHybridDemo,
  parseSampleRate,
  resolveApiUrl,
  resolveDataSource,
} from '../env';

describe('resolveDataSource', () => {
  it('defaults to live when both unset', () => {
    expect(resolveDataSource(undefined, undefined)).toBe('live');
  });

  it('VITE_USE_MOCK=true forces mock', () => {
    expect(resolveDataSource('true', 'live')).toBe('mock');
    expect(resolveDataSource('1', 'live')).toBe('mock');
  });

  it('VITE_USE_MOCK=false forces live', () => {
    expect(resolveDataSource('false', 'mock')).toBe('live');
    expect(resolveDataSource('0', 'mock')).toBe('live');
  });

  it('falls back to VITE_DATA_SOURCE when USE_MOCK unset', () => {
    expect(resolveDataSource(undefined, 'mock')).toBe('mock');
    expect(resolveDataSource(undefined, 'live')).toBe('live');
  });
});

describe('resolveApiUrl', () => {
  it('VITE_API_BASE_URL takes precedence', () => {
    expect(resolveApiUrl('https://api.example.com', 'http://localhost:9000')).toBe(
      'https://api.example.com',
    );
  });

  it('falls back to VITE_API_URL', () => {
    expect(resolveApiUrl(undefined, 'http://localhost:9000')).toBe('http://localhost:9000');
  });

  it('returns empty string when both unset', () => {
    expect(resolveApiUrl(undefined, undefined)).toBe('');
  });
});

describe('parseHybridDemo', () => {
  it('defaults to isDev when unset', () => {
    expect(parseHybridDemo(undefined, true)).toBe(true);
    expect(parseHybridDemo(undefined, false)).toBe(false);
  });

  it('respects explicit false', () => {
    expect(parseHybridDemo('false', true)).toBe(false);
    expect(parseHybridDemo('0', true)).toBe(false);
  });

  it('respects explicit true', () => {
    expect(parseHybridDemo('true', false)).toBe(true);
    expect(parseHybridDemo('1', false)).toBe(true);
  });
});

describe('parseAuthProvider', () => {
  it('defaults to stub', () => {
    expect(parseAuthProvider(undefined)).toBe('stub');
    expect(parseAuthProvider('')).toBe('stub');
  });

  it('selects jwt when set', () => {
    expect(parseAuthProvider('jwt')).toBe('jwt');
    expect(parseAuthProvider('JWT')).toBe('jwt');
  });
});

describe('parseSampleRate', () => {
  it('clamps values between 0 and 1', () => {
    expect(parseSampleRate('0.25', 0)).toBe(0.25);
    expect(parseSampleRate('2', 0)).toBe(1);
    expect(parseSampleRate('-1', 0)).toBe(0);
  });

  it('falls back when unset or invalid', () => {
    expect(parseSampleRate(undefined, 0.1)).toBe(0.1);
    expect(parseSampleRate('invalid', 0.05)).toBe(0.05);
  });
});

describe('getRuntimeConfig', () => {
  it('exposes safe subset without API key', () => {
    const config = getRuntimeConfig();
    expect(config).toHaveProperty('apiUrl');
    expect(config).toHaveProperty('tenantId');
    expect(config).toHaveProperty('dataSource');
    expect(config).toHaveProperty('sentryEnabled');
    expect(config).not.toHaveProperty('apiKey');
    expect(Object.keys(config)).not.toContain('apiKey');
  });
});
