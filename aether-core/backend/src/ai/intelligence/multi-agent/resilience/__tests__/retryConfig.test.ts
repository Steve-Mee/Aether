import { getRetryConfig, isRetryEnabled, withRetry, sleep, isIdempotentOperation } from '../retryConfig';

describe('retryConfig', () => {
  beforeEach(() => {
    delete process.env.MULTI_AGENT_RETRY_ENABLED;
    delete process.env.MULTI_AGENT_RETRY_MAX_ATTEMPTS;
    delete process.env.MULTI_AGENT_RETRY_INITIAL_DELAY_MS;
  });

  it('isRetryEnabled defaults to true', () => {
    expect(isRetryEnabled()).toBe(true);
  });

  it('isRetryEnabled respects env var', () => {
    process.env.MULTI_AGENT_RETRY_ENABLED = 'false';
    expect(isRetryEnabled()).toBe(false);
  });

  it('getRetryConfig returns defaults', () => {
    const config = getRetryConfig();
    expect(config.maxAttempts).toBe(2);
    expect(config.initialDelayMs).toBe(500);
    expect(config.maxDelayMs).toBe(5000);
    expect(config.backoffMultiplier).toBe(2);
  });

  it('getRetryConfig respects env vars', () => {
    process.env.MULTI_AGENT_RETRY_MAX_ATTEMPTS = '3';
    process.env.MULTI_AGENT_RETRY_INITIAL_DELAY_MS = '1000';
    const config = getRetryConfig();
    expect(config.maxAttempts).toBe(3);
    expect(config.initialDelayMs).toBe(1000);
  });

  it('isIdempotentOperation identifies read-only agents', () => {
    expect(isIdempotentOperation('supplier', false)).toBe(true);
    expect(isIdempotentOperation('forecast', false)).toBe(true);
    expect(isIdempotentOperation('pricing', true)).toBe(false);
    expect(isIdempotentOperation('outcomes', false)).toBe(true);
  });

  it('withRetry succeeds on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const config = getRetryConfig();
    const result = await withRetry(operation, config, true);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('withRetry retries on failure and succeeds', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('success');
    const config = { ...getRetryConfig(), initialDelayMs: 10, maxDelayMs: 50 };
    const result = await withRetry(operation, config, true);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('withRetry exhausts attempts and throws', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('persistent failure'));
    const config = { ...getRetryConfig(), maxAttempts: 2, initialDelayMs: 10 };
    await expect(withRetry(operation, config, true)).rejects.toThrow('persistent failure');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('withRetry skips retry if not idempotent', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('fail'));
    const config = getRetryConfig();
    await expect(withRetry(operation, config, false)).rejects.toThrow('fail');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('withRetry calls onRetry callback', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('success');
    const onRetry = jest.fn();
    const config = { ...getRetryConfig(), initialDelayMs: 10 };
    await withRetry(operation, config, true, onRetry);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });
});
