export const MEMORY_INTENT = 'MEMORY';
export const MEMORY_PREFIX = '[MEMORY]';

/** v2 taxonomy */
export const MEMORY_KIND_EPISODIC = 'episodic';
export const MEMORY_KIND_SEMANTIC = 'semantic';
export const MEMORY_KIND_INTERACTION = 'interaction';
export const MEMORY_KIND_PLAN = 'plan';
export const MEMORY_KIND_ADAPTIVE = 'adaptive';
export const MEMORY_KIND_REFLECTION = 'reflection';

/** v1 aliases — read-path backward compat */
export const MEMORY_TYPE_LONG_TERM = 'long_term';
export const MEMORY_TYPE_INTERACTION = 'interaction';

export const RECALLABLE_MEMORY_KINDS = [MEMORY_KIND_EPISODIC, MEMORY_KIND_SEMANTIC] as const;
export const REFLECTION_MEMORY_KINDS = [MEMORY_KIND_REFLECTION] as const;

export const DEFAULT_SHORT_TERM_LIMIT = 15;
export const DEFAULT_CONVERSATION_TURN_LIMIT = 30;
export const DEFAULT_LONG_TERM_TTL_DAYS = 180;
export const DEFAULT_LOW_PRIORITY_MAX_AGE_DAYS = 90;
export const DEFAULT_INTERACTION_TTL_DAYS = 7;
export const DEFAULT_PROMPT_MAX_CHARS = 1400;
export const DEFAULT_RECALL_MAX_ENTRIES = 5;

export function isPersonalBrainMemoryEnabled(): boolean {
  return process.env.PERSONAL_BRAIN_MEMORY_ENABLED !== 'false';
}

export function isSemanticShortTermEnabled(): boolean {
  return process.env.PERSONAL_BRAIN_MEMORY_SEMANTIC_SHORT_TERM === 'true';
}

export function isMemoryReflectionEnabled(): boolean {
  if (process.env.PERSONAL_BRAIN_EXPERIENCE_REFLECTION_ENABLED === 'false') {
    return false;
  }
  return process.env.PERSONAL_BRAIN_MEMORY_REFLECTION_ENABLED !== 'false';
}

export function isExperienceReflectionEnabled(): boolean {
  return isMemoryReflectionEnabled();
}

export function isReflectionConsolidationEnabled(): boolean {
  return process.env.PERSONAL_BRAIN_REFLECTION_CONSOLIDATION_ENABLED !== 'false';
}

export function getReflectionConsolidationMinAgeDays(): number {
  const raw = process.env.PERSONAL_BRAIN_REFLECTION_CONSOLIDATION_MIN_AGE_DAYS;
  const parsed = raw ? parseInt(raw, 10) : 14;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 14;
}

export function getReflectionConsolidationMaxPerTenant(): number {
  const raw = process.env.PERSONAL_BRAIN_REFLECTION_CONSOLIDATION_MAX_PER_TENANT;
  const parsed = raw ? parseInt(raw, 10) : 20;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

export function isMemorySummarizationLlmEnabled(): boolean {
  return process.env.PERSONAL_BRAIN_MEMORY_SUMMARIZATION_LLM === 'true';
}

export function getShortTermLimit(): number {
  const raw = process.env.PERSONAL_BRAIN_MEMORY_SHORT_TERM_LIMIT;
  const parsed = raw ? parseInt(raw, 10) : DEFAULT_SHORT_TERM_LIMIT;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SHORT_TERM_LIMIT;
}

export function getConversationTurnLimit(): number {
  const raw = process.env.PERSONAL_BRAIN_MEMORY_CONVERSATION_TURN_LIMIT;
  const parsed = raw ? parseInt(raw, 10) : DEFAULT_CONVERSATION_TURN_LIMIT;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CONVERSATION_TURN_LIMIT;
}

export function getLongTermTtlDays(): number {
  const raw = process.env.PERSONAL_BRAIN_MEMORY_LONG_TERM_TTL_DAYS;
  const parsed = raw ? parseInt(raw, 10) : DEFAULT_LONG_TERM_TTL_DAYS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LONG_TERM_TTL_DAYS;
}

export function getInteractionTtlDays(): number {
  const raw = process.env.PERSONAL_BRAIN_MEMORY_INTERACTION_TTL_DAYS;
  const parsed = raw ? parseInt(raw, 10) : DEFAULT_INTERACTION_TTL_DAYS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERACTION_TTL_DAYS;
}

/** Normalize v1 memoryType values to v2 kinds */
export function normalizeMemoryKind(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === MEMORY_TYPE_LONG_TERM) return MEMORY_KIND_EPISODIC;
  if (value === MEMORY_TYPE_INTERACTION) return MEMORY_KIND_INTERACTION;
  return value;
}

export function isRecallableMemoryKind(kind: string | undefined): boolean {
  const normalized = normalizeMemoryKind(kind);
  return (
    normalized === MEMORY_KIND_EPISODIC ||
    normalized === MEMORY_KIND_SEMANTIC ||
    normalized === MEMORY_KIND_REFLECTION
  );
}
