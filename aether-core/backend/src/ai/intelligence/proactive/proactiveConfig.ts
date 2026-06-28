export const PROACTIVE_SUGGESTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PROACTIVE_DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const PROACTIVE_LOW_STOCK_THRESHOLD = 10;
export const PROACTIVE_MARGIN_MIN_COUNT = 3;
export const PROACTIVE_ORDER_ANOMALY_PCT = 25;
export const PROACTIVE_SUPPLIER_DROP_PCT = 5;
export const PROACTIVE_ENRICHMENT_MAX_PER_HOUR = 3;
export const PROACTIVE_AUTO_EXECUTE_COOLDOWN_MS = 4 * 60 * 60 * 1000;
export const PROACTIVE_LEARNING_WINDOW_DAYS = 14;
export const PROACTIVE_EMAIL_MAX_PER_HOUR = 1;
export const PROACTIVE_DETECTION_ORCH_MAX_PER_HOUR = 2;

function prodSafeFlag(name: string): boolean {
  if (process.env[name] === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env[name] !== 'true') return false;
  return process.env[name] === 'true';
}

export function isProactiveBrainEnabled(): boolean {
  if (process.env.PROACTIVE_BRAIN_ENABLED === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.PROACTIVE_BRAIN_ENABLED !== 'true') {
    return false;
  }
  return process.env.PROACTIVE_BRAIN_ENABLED === 'true';
}

export function resolveProactiveBrainIntervalMs(): number {
  return parseInt(process.env.PROACTIVE_BRAIN_INTERVAL_MS ?? '3600000', 10);
}

export function isProactiveCrossDedupeEnabled(): boolean {
  return prodSafeFlag('PROACTIVE_CROSS_DEDUPE_ENABLED');
}

export function isProactiveSseEnabled(): boolean {
  return prodSafeFlag('PROACTIVE_SSE_ENABLED');
}

export function isProactiveLearningEnabled(): boolean {
  return prodSafeFlag('PROACTIVE_LEARNING_ENABLED');
}

export function isProactiveLlmEnrichmentEnabled(): boolean {
  return prodSafeFlag('PROACTIVE_LLM_ENRICHMENT_ENABLED');
}

export function isProactiveAutoExecuteEnabled(): boolean {
  return prodSafeFlag('PROACTIVE_AUTO_EXECUTE_ENABLED');
}

export function resolveProactiveEnrichmentMaxPerHour(): number {
  return parseInt(process.env.PROACTIVE_ENRICHMENT_MAX_PER_HOUR ?? String(PROACTIVE_ENRICHMENT_MAX_PER_HOUR), 10);
}

export function resolveProactiveAutoExecuteCooldownMs(): number {
  return parseInt(
    process.env.PROACTIVE_AUTO_EXECUTE_COOLDOWN_MS ?? String(PROACTIVE_AUTO_EXECUTE_COOLDOWN_MS),
    10
  );
}

export function isProactiveEmailNotificationsEnabled(): boolean {
  return prodSafeFlag('PROACTIVE_EMAIL_NOTIFICATIONS_ENABLED');
}

export function resolveProactiveEmailMaxPerHour(): number {
  return parseInt(
    process.env.PROACTIVE_EMAIL_MAX_PER_HOUR ?? String(PROACTIVE_EMAIL_MAX_PER_HOUR),
    10
  );
}

export function isProactiveGlobalPatternsEnabled(): boolean {
  return prodSafeFlag('PROACTIVE_GLOBAL_PATTERNS_ENABLED');
}

export function isProactiveDetectionOrchestrationEnabled(): boolean {
  return prodSafeFlag('PROACTIVE_DETECTION_ORCHESTRATION_ENABLED');
}

export function isProactiveDetectionUnifyPeer(): boolean {
  return prodSafeFlag('PROACTIVE_DETECTION_UNIFY_PEER');
}

export function resolveProactiveDetectionOrchMaxPerHour(): number {
  return parseInt(
    process.env.PROACTIVE_DETECTION_ORCH_MAX_PER_HOUR ?? String(PROACTIVE_DETECTION_ORCH_MAX_PER_HOUR),
    10
  );
}
