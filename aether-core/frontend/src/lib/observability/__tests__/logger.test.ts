import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes dev log lines with AETHER', () => {
    logger.info('test.event', { domain: 'test' });
    expect(console.info).toHaveBeenCalled();
    const line = String(vi.mocked(console.info).mock.calls[0]?.[0]);
    expect(line).toContain('[AETHER]');
    expect(line).toContain('test.event');
  });
});
