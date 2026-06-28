export const COMPOUND_SPLIT =
  /\s+(?:en\s+daarna|daarna|vervolgens|hierna|en\s+vervolgens|en\s+hierna|,\s*daarna)\s+/i;

export const MAX_COMPOUND_STEPS = 3;

export function isCompoundEnabled(): boolean {
  return process.env.COMMAND_BRAIN_COMPOUND_ENABLED !== 'false';
}

export interface CompoundParseResult {
  original: string;
  parts: string[];
}

export function tryParseCompound(command: string): CompoundParseResult | null {
  if (!isCompoundEnabled()) return null;

  const trimmed = command.trim();
  if (!trimmed) return null;

  const parts = trimmed
    .split(COMPOUND_SPLIT)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  return {
    original: trimmed,
    parts: parts.slice(0, MAX_COMPOUND_STEPS),
  };
}
