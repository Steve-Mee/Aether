export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export function isRetryEnabled(): boolean {
  return process.env.MULTI_AGENT_RETRY_ENABLED !== 'false';
}

export function getRetryConfig(): RetryConfig {
  const maxAttempts = process.env.MULTI_AGENT_RETRY_MAX_ATTEMPTS
    ? Number(process.env.MULTI_AGENT_RETRY_MAX_ATTEMPTS)
    : 2;
  const initialDelayMs = process.env.MULTI_AGENT_RETRY_INITIAL_DELAY_MS
    ? Number(process.env.MULTI_AGENT_RETRY_INITIAL_DELAY_MS)
    : 500;
  const maxDelayMs = process.env.MULTI_AGENT_RETRY_MAX_DELAY_MS
    ? Number(process.env.MULTI_AGENT_RETRY_MAX_DELAY_MS)
    : 5000;
  const backoffMultiplier = process.env.MULTI_AGENT_RETRY_BACKOFF_MULTIPLIER
    ? Number(process.env.MULTI_AGENT_RETRY_BACKOFF_MULTIPLIER)
    : 2;

  return {
    maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 2,
    initialDelayMs: Number.isFinite(initialDelayMs) && initialDelayMs > 0 ? initialDelayMs : 500,
    maxDelayMs: Number.isFinite(maxDelayMs) && maxDelayMs > 0 ? maxDelayMs : 5000,
    backoffMultiplier:
      Number.isFinite(backoffMultiplier) && backoffMultiplier > 0 ? backoffMultiplier : 2,
  };
}

export function isIdempotentOperation(agentKey: string, hasToolCalls: boolean): boolean {
  const readOnlyAgents = new Set(['supplier', 'forecast', 'outcomes']);
  return readOnlyAgents.has(agentKey) || !hasToolCalls;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  isIdempotent: boolean,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  if (!isIdempotent || config.maxAttempts <= 1) {
    return operation();
  }

  let lastError: Error | undefined;
  let delayMs = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxAttempts) {
        break;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await sleep(Math.min(delayMs, config.maxDelayMs));
      delayMs *= config.backoffMultiplier;
    }
  }

  throw lastError ?? new Error('Operation failed after retries');
}
