import type { LongTermMemoryStore } from '../../memory/LongTermMemoryStore';

export interface ReflectionAdaptiveHintQuery {
  tool?: string;
  intent?: string;
  command?: string;
  agentKey?: string;
}

export interface ReflectionAdaptiveHints {
  hints: string[];
  preferConfirm?: boolean;
  sourceReflectionIds: string[];
}

export function isReflectionAdaptiveEnabled(): boolean {
  return process.env.PERSONAL_BRAIN_REFLECTION_ADAPTIVE_ENABLED !== 'false';
}

export function getReflectionAdaptiveMaxHints(): number {
  const raw = process.env.PERSONAL_BRAIN_REFLECTION_ADAPTIVE_MAX_HINTS;
  const parsed = raw ? parseInt(raw, 10) : 2;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

export class ReflectionAdaptiveHintService {
  constructor(private longTerm: LongTermMemoryStore) {}

  async getHintsFromReflections(
    tenantId: string,
    query: ReflectionAdaptiveHintQuery
  ): Promise<ReflectionAdaptiveHints | null> {
    if (!isReflectionAdaptiveEnabled()) return null;

    const reflections = await this.longTerm.listReflections(
      tenantId,
      20,
      query.agentKey
    );
    if (reflections.length === 0) return null;

    const maxHints = getReflectionAdaptiveMaxHints();
    const hints: string[] = [];
    const sourceReflectionIds: string[] = [];
    let preferConfirm = false;

    for (const match of reflections) {
      const payload = match.reflectionPayload;
      if (!payload) continue;

      const intentMatch = !query.intent || payload.intent === query.intent;
      const toolMatch =
        !query.tool ||
        payload.toolsUsed?.includes(query.tool) ||
        payload.toolsUsed?.some((t) => t.includes(query.tool!));

      if (!intentMatch && !toolMatch) continue;

      sourceReflectionIds.push(match.id);

      if (!payload.success && payload.couldImprove.length > 0) {
        preferConfirm = true;
        for (const item of payload.couldImprove) {
          if (hints.length >= maxHints) break;
          hints.push(`Eerdere ervaring: ${item}`);
        }
      }

      for (const learning of payload.futureLearnings) {
        if (hints.length >= maxHints) break;
        hints.push(learning);
      }
    }

    if (hints.length === 0 && !preferConfirm) return null;

    return {
      hints: hints.slice(0, maxHints),
      preferConfirm: preferConfirm || undefined,
      sourceReflectionIds,
    };
  }
}
