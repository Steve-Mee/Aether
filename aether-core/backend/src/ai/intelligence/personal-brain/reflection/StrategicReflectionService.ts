import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';
import type { LongTermMemoryStore } from '../memory/LongTermMemoryStore';
import { MEMORY_KIND_REFLECTION } from '../memory/constants';
import type { StrategicMemoryService } from '../memory/StrategicMemoryService';
import type {
  ActiveGoalSnapshot,
  GoalProgress,
  StrategyAdaptation,
  StrategicReflection,
  StrategicReflectionInput,
  StrategicReflectionResult,
} from './strategicTypes';
import { logger } from '../../../../shared/logging/logger';

export function isStrategicReflectionEnabled(): boolean {
  return process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_ENABLED !== 'false';
}

export function getStrategicReflectionPeriodDays(): number {
  const raw = process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_PERIOD_DAYS;
  const parsed = raw ? parseInt(raw, 10) : 7;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

/**
 * Strategic reflection service for periodic evaluation of goal progress and strategy adaptation.
 * Separate from ExperienceReflectionService (which is post-run, action-level).
 * This service evaluates longer-term patterns and strategic direction.
 */
export class StrategicReflectionService {
  constructor(
    private longTerm: LongTermMemoryStore,
    private strategicMemory?: StrategicMemoryService,
    private llm: LlmInferencePort = defaultOllamaInference
  ) {}

  async shouldRunStrategicReflection(
    tenantId: string,
    agentKey?: string
  ): Promise<boolean> {
    if (!isStrategicReflectionEnabled()) return false;

    const lastReflection = await this.getLastStrategicReflection(tenantId, agentKey);
    if (!lastReflection) return true;

    const periodDays = getStrategicReflectionPeriodDays();
    const timeSinceLastMs = Date.now() - new Date(lastReflection.timestamp).getTime();
    const daysSinceLast = timeSinceLastMs / (1000 * 60 * 60 * 24);

    return daysSinceLast >= periodDays;
  }

  async reflect(input: StrategicReflectionInput): Promise<StrategicReflection | null> {
    if (!isStrategicReflectionEnabled()) return null;

    const periodDays = input.periodDays ?? getStrategicReflectionPeriodDays();
    const activeGoals = input.activeGoals ?? [];
    const recentMemories = await this.gatherRecentContext(
      input.tenantId,
      periodDays,
      input.agentKey
    );

    if (recentMemories.length === 0 && activeGoals.length === 0) {
      return this.buildMinimalReflection(input, periodDays);
    }

    return this.generateStrategicReflection(input, recentMemories, periodDays, activeGoals);
  }

  async reflectAndStore(
    input: StrategicReflectionInput
  ): Promise<StrategicReflectionResult | null> {
    if (!isStrategicReflectionEnabled()) return null;

    const reflection = await this.reflect(input);
    if (!reflection) return null;

    const activeGoals = input.activeGoals ?? [];
    const isEmptyMinimal =
      activeGoals.length === 0 &&
      reflection.goalProgress.length === 0 &&
      reflection.strategyAdaptations.length === 0 &&
      reflection.insightsSummary === 'Geen recente data beschikbaar voor strategische reflectie';

    if (isEmptyMinimal) {
      logger.info('strategic_reflection_skipped_no_goals', { tenantId: input.tenantId });
      return null;
    }

    const memoryIds = await this.storeStrategicReflection(reflection);
    return { reflection, memoryIds };
  }

  private async generateStrategicReflection(
    input: StrategicReflectionInput,
    recentMemories: string[],
    periodDays: number,
    activeGoals: ActiveGoalSnapshot[]
  ): Promise<StrategicReflection> {
    const focusHint = input.focusAreas?.length
      ? `Focus op: ${input.focusAreas.join(', ')}`
      : '';

    const goalsBlock =
      activeGoals.length > 0
        ? `Actieve doelen (alleen deze evalueren — verzin geen nieuwe doelen):\n${activeGoals
            .slice(0, 5)
            .map(
              (g) =>
                `- [${g.id}] ${g.title} (${g.metricType}): ${g.progressPct ?? 0}% richting ${g.targetValue}, status ${g.status}`
            )
            .join('\n')}`
        : 'Geen actieve doelen gedefinieerd — laat goalProgress leeg ([]) en verzin geen doelen.';

    const prompt = `Je bent de strategische reflectie-laag van een merchant brein.
Evalueer de afgelopen ${periodDays} dagen en analyseer:
1. Voortgang op doelen
2. Welke strategieën werken/niet werken
3. Welke aanpassingen worden aanbevolen

Geef JSON:
{
  "goalProgress": [
    {
      "goal": "beschrijving",
      "status": "on_track|at_risk|off_track|achieved|blocked",
      "progress": 0.0-1.0,
      "keyActions": ["actie1", "actie2"],
      "blockers": ["optioneel blocker"],
      "recommendation": "optioneel advies"
    }
  ],
  "strategyAdaptations": [
    {
      "currentStrategy": "huidige strategie",
      "proposedAdaptation": "voorgestelde aanpassing",
      "reason": "waarom",
      "impact": "high|medium|low",
      "confidence": 0.0-1.0
    }
  ],
  "insightsSummary": "beknopte samenvatting (max 200 chars)"
}

${focusHint}

${goalsBlock}

Recente context (laatste ${periodDays} dagen):
${recentMemories.slice(0, 10).join('\n')}

Regels:
- Max 3 goalProgress items
- Max 2 strategyAdaptations
- Wees concreet en actionable
- Alleen geldige JSON
- Verzin geen doelen die niet in de actieve doelenlijst staan`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.3 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.buildFallbackReflection(input, periodDays, recentMemories, activeGoals);
      }
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return this.normalizeStrategicReflection(parsed, input, periodDays, activeGoals);
    } catch {
      return this.buildFallbackReflection(input, periodDays, recentMemories, activeGoals);
    }
  }

  private async gatherRecentContext(
    tenantId: string,
    periodDays: number,
    agentKey?: string
  ): Promise<string[]> {
    const memories: string[] = [];

    if (this.strategicMemory) {
      const strategies = await this.strategicMemory.recallStrategies(tenantId, '', 5, agentKey);
      memories.push(
        ...strategies.map((s) => `${s.strategy} | ${s.context} | ${s.outcome}`)
      );
    }

    const reflections = await this.longTerm.listReflections(tenantId, 20, agentKey);
    const recent = reflections.filter((r) => {
      if (!r.timestamp) return false;
      const age = Date.now() - new Date(r.timestamp).getTime();
      const daysSince = age / (1000 * 60 * 60 * 24);
      return daysSince <= periodDays;
    });

    memories.push(...recent.map((r) => r.summary));

    return memories;
  }

  private async storeStrategicReflection(
    reflection: StrategicReflection
  ): Promise<string[]> {
    const summary = this.formatStrategicReflectionSummary(reflection);
    const id = await this.longTerm.store({
      tenantId: reflection.tenantId,
      agentKey: reflection.agentKey,
      command: `Strategic reflection: ${reflection.periodCovered.from} to ${reflection.periodCovered.to}`,
      intent: 'STRATEGIC_REFLECTION',
      summary,
      priority: 'high',
      memoryKind: MEMORY_KIND_REFLECTION,
      lessonLearned: true,
    });

    const memoryIds = [id];

    if (this.strategicMemory && reflection.strategyAdaptations.length > 0) {
      for (const adaptation of reflection.strategyAdaptations) {
        const stratId = await this.strategicMemory.rememberStrategy({
          tenantId: reflection.tenantId,
          agentKey: reflection.agentKey,
          strategy: adaptation.proposedAdaptation,
          context: adaptation.reason,
          outcome: 'mixed',
          impact: adaptation.impact,
        });
        if (stratId) memoryIds.push(stratId);
      }
    }

    return memoryIds;
  }

  private async getLastStrategicReflection(
    tenantId: string,
    agentKey?: string
  ): Promise<{ timestamp: string } | null> {
    const reflections = await this.longTerm.listReflections(tenantId, 50, agentKey);
    const strategic = reflections.find((r) =>
      r.summary.includes('Strategic reflection:')
    );
    return strategic?.timestamp ? { timestamp: strategic.timestamp } : null;
  }

  private normalizeStrategicReflection(
    raw: Record<string, unknown>,
    input: StrategicReflectionInput,
    periodDays: number,
    activeGoals: ActiveGoalSnapshot[] = input.activeGoals ?? []
  ): StrategicReflection {
    const now = new Date();
    const from = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    return {
      goalProgress: this.normalizeGoalProgress(raw.goalProgress, activeGoals),
      strategyAdaptations: this.normalizeStrategyAdaptations(raw.strategyAdaptations),
      insightsSummary:
        typeof raw.insightsSummary === 'string'
          ? raw.insightsSummary.slice(0, 200)
          : 'Strategische evaluatie voltooid',
      periodCovered: {
        from: from.toISOString(),
        to: now.toISOString(),
      },
      tenantId: input.tenantId,
      agentKey: input.agentKey,
    };
  }

  private normalizeGoalProgress(
    value: unknown,
    activeGoals: ActiveGoalSnapshot[] = []
  ): GoalProgress[] {
    if (!Array.isArray(value)) return [];
    const allowedTitles = new Set(activeGoals.map((g) => g.title.toLowerCase()));
    return value
      .filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
      )
      .filter((item) => {
        if (activeGoals.length === 0) return false;
        const goalText = typeof item.goal === 'string' ? item.goal.toLowerCase() : '';
        return [...allowedTitles].some((title) => goalText.includes(title) || title.includes(goalText));
      })
      .slice(0, 3)
      .map((item) => ({
        goal: typeof item.goal === 'string' ? item.goal.slice(0, 120) : 'Unknown goal',
        status: this.normalizeStatus(item.status),
        progress: typeof item.progress === 'number' ? Math.max(0, Math.min(1, item.progress)) : 0.5,
        keyActions: this.normalizeStringArray(item.keyActions, 3),
        blockers: this.normalizeStringArray(item.blockers, 2),
        recommendation:
          typeof item.recommendation === 'string' ? item.recommendation.slice(0, 150) : undefined,
      }));
  }

  private normalizeStrategyAdaptations(value: unknown): StrategyAdaptation[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
      )
      .slice(0, 2)
      .map((item) => ({
        currentStrategy:
          typeof item.currentStrategy === 'string' ? item.currentStrategy.slice(0, 120) : 'N/A',
        proposedAdaptation:
          typeof item.proposedAdaptation === 'string'
            ? item.proposedAdaptation.slice(0, 120)
            : 'N/A',
        reason: typeof item.reason === 'string' ? item.reason.slice(0, 200) : 'N/A',
        impact: this.normalizeImpact(item.impact),
        confidence: typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
      }));
  }

  private normalizeStatus(
    value: unknown
  ): 'on_track' | 'at_risk' | 'off_track' | 'achieved' | 'blocked' {
    const valid = ['on_track', 'at_risk', 'off_track', 'achieved', 'blocked'];
    return valid.includes(String(value)) ? (String(value) as GoalProgress['status']) : 'on_track';
  }

  private normalizeImpact(value: unknown): 'high' | 'medium' | 'low' {
    const valid = ['high', 'medium', 'low'];
    return valid.includes(String(value)) ? (String(value) as 'high' | 'medium' | 'low') : 'medium';
  }

  private normalizeStringArray(value: unknown, max: number): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim().slice(0, 120))
      .slice(0, max);
  }

  private buildMinimalReflection(
    input: StrategicReflectionInput,
    periodDays: number
  ): StrategicReflection {
    const now = new Date();
    const from = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    return {
      goalProgress: [],
      strategyAdaptations: [],
      insightsSummary: 'Geen recente data beschikbaar voor strategische reflectie',
      periodCovered: { from: from.toISOString(), to: now.toISOString() },
      tenantId: input.tenantId,
      agentKey: input.agentKey,
    };
  }

  private buildFallbackReflection(
    input: StrategicReflectionInput,
    periodDays: number,
    recentMemories: string[],
    activeGoals: ActiveGoalSnapshot[] = input.activeGoals ?? []
  ): StrategicReflection {
    const now = new Date();
    const from = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const goalProgress: GoalProgress[] =
      activeGoals.length > 0
        ? activeGoals.slice(0, 3).map((g) => ({
            goal: g.title,
            status: 'on_track' as const,
            progress: (g.progressPct ?? 0) / 100,
            keyActions: recentMemories.slice(0, 2),
          }))
        : [];

    return {
      goalProgress,
      strategyAdaptations: [],
      insightsSummary: `${recentMemories.length} acties in afgelopen ${periodDays} dagen`,
      periodCovered: { from: from.toISOString(), to: now.toISOString() },
      tenantId: input.tenantId,
      agentKey: input.agentKey,
    };
  }

  private formatStrategicReflectionSummary(reflection: StrategicReflection): string {
    const goalCount = reflection.goalProgress.length;
    const adaptCount = reflection.strategyAdaptations.length;
    return `Strategic reflection: ${goalCount} doelen, ${adaptCount} strategie-aanpassingen | ${reflection.insightsSummary}`;
  }
}
