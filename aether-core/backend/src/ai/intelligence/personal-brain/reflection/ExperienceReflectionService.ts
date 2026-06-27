import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';
import type { LongTermMemoryStore } from '../memory/LongTermMemoryStore';
import { MEMORY_KIND_REFLECTION } from '../memory/constants';
import type { ExperienceReflectionPort } from './ExperienceReflectionPort';
import {
  isExperienceReflectionEnabled,
  resolveTrigger,
  shouldReflect,
} from './ReflectionTriggerPolicy';
import type {
  ExperienceReflection,
  ExperienceReflectionResult,
  ReflectionInput,
  ReflectionTrigger,
  ReflectionTriggerContext,
} from './types';

export class ExperienceReflectionService implements ExperienceReflectionPort {
  constructor(
    private longTerm: LongTermMemoryStore,
    private llm: LlmInferencePort = defaultOllamaInference
  ) {}

  shouldReflect(context: ReflectionTriggerContext): boolean {
    return shouldReflect(context);
  }

  resolveTrigger(context: ReflectionTriggerContext): ReflectionTrigger | null {
    return resolveTrigger(context);
  }

  async reflect(input: ReflectionInput): Promise<ExperienceReflection | null> {
    if (!isExperienceReflectionEnabled()) return null;
    return this.generateReflection(input);
  }

  async reflectAndStore(input: ReflectionInput): Promise<ExperienceReflectionResult | null> {
    if (!isExperienceReflectionEnabled()) return null;

    const reflection = await this.generateReflection(input);
    if (!reflection) return null;

    const memoryIds = await this.storeReflection(
      input.tenantId,
      input.command,
      reflection,
      input.agentKey
    );
    return { reflection, memoryIds };
  }

  async storeReflection(
    tenantId: string,
    command: string,
    reflection: ExperienceReflection,
    agentKey?: string
  ): Promise<string[]> {
    const summary = formatReflectionSummary(reflection);
    const id = await this.longTerm.store({
      tenantId,
      agentKey,
      command,
      intent: reflection.intent,
      summary,
      priority: 'high',
      memoryKind: MEMORY_KIND_REFLECTION,
      lessonLearned: true,
      reflectionPayload: reflection,
    });
    return [id];
  }

  private async generateReflection(input: ReflectionInput): Promise<ExperienceReflection | null> {
    const stepReflections =
      input.stepReflections?.join('; ') ??
      input.summary.reflections?.join('; ') ??
      '';
    const planSteps =
      input.plan?.steps.map((s) => s.label).join(' → ') ??
      input.summary.completedSteps.map((s) => s.label).join(' → ');
    const tools =
      input.toolTrace?.map((t) => t.tool).join(', ') ??
      input.summary.completedSteps.map((s) => s.tool).filter(Boolean).join(', ');

    const prompt = `Je bent het reflectie-geheugen van een e-commerce merchant brein.
Na afloop van een actie maak je een gestructureerde debrief voor toekomstig leren.
Geef JSON:
{
  "goal": "wat was het doel",
  "stepsTaken": ["stap1", "stap2"],
  "outcome": "kort resultaat",
  "wentWell": ["punt1"],
  "couldImprove": ["punt1"],
  "futureLearnings": ["leerpunt voor volgende keer"]
}

Commando: ${input.command}
Intent: ${input.intent}
Doel bereikt: ${input.summary.goalReached}
Trigger: ${input.trigger}
Plan stappen: ${planSteps || 'n.v.t.'}
Tools: ${tools || 'geen'}
Narratief: ${input.summary.narrative.slice(0, 400)}
Stap-reflecties: ${stepReflections.slice(0, 500)}

Regels:
- Max 3 items per array
- futureLearnings: concreet en actionable
- Antwoord alleen met geldige JSON`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.2 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return buildFallbackReflection(input);
      }
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return normalizeReflection(parsed, input);
    } catch {
      return buildFallbackReflection(input);
    }
  }
}

function normalizeReflection(
  raw: Record<string, unknown>,
  input: ReflectionInput
): ExperienceReflection {
  return {
    goal:
      typeof raw.goal === 'string' && raw.goal.trim()
        ? raw.goal.trim().slice(0, 200)
        : input.plan?.goal ?? input.command.slice(0, 120),
    stepsTaken: stringArray(raw.stepsTaken, 3, () =>
      input.summary.completedSteps.map((s) => s.label).slice(0, 3)
    ),
    outcome:
      typeof raw.outcome === 'string' && raw.outcome.trim()
        ? raw.outcome.trim().slice(0, 200)
        : input.summary.narrative.slice(0, 200),
    wentWell: stringArray(raw.wentWell, 3, () =>
      input.summary.goalReached ? ['Doel bereikt'] : []
    ),
    couldImprove: stringArray(raw.couldImprove, 3, () =>
      input.summary.failedSteps.length > 0
        ? input.summary.failedSteps.map((s) => s.error ?? s.label).slice(0, 3)
        : []
    ),
    futureLearnings: stringArray(raw.futureLearnings, 3, () => [
      input.summary.narrative.slice(0, 120),
    ]),
    trigger: input.trigger,
    success: input.summary.goalReached,
    intent: input.intent,
    command: input.command,
    toolsUsed:
      input.toolTrace?.map((t) => t.tool) ??
      input.summary.completedSteps.map((s) => s.tool).filter((t): t is string => Boolean(t)),
  };
}

function buildFallbackReflection(input: ReflectionInput): ExperienceReflection {
  return {
    goal: input.plan?.goal ?? input.command.slice(0, 120),
    stepsTaken: input.summary.completedSteps.map((s) => s.label).slice(0, 3),
    outcome: input.summary.narrative.slice(0, 200),
    wentWell: input.summary.goalReached ? ['Doel bereikt'] : [],
    couldImprove: input.summary.failedSteps.map((s) => s.error ?? s.label).slice(0, 3),
    futureLearnings: [input.summary.narrative.slice(0, 120)],
    trigger: input.trigger,
    success: input.summary.goalReached,
    intent: input.intent,
    command: input.command,
    toolsUsed: input.toolTrace?.map((t) => t.tool),
  };
}

function stringArray(
  value: unknown,
  max: number,
  fallback: () => string[]
): string[] {
  if (!Array.isArray(value)) return fallback().map((s) => s.slice(0, 120)).slice(0, max);
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 120))
    .slice(0, max);
}

export function formatReflectionSummary(reflection: ExperienceReflection): string {
  const learnings = reflection.futureLearnings.join('; ') || reflection.outcome;
  const wentWell = reflection.wentWell.length > 0 ? reflection.wentWell.join('; ') : '—';
  return `Doel: ${reflection.goal} | Ging goed: ${wentWell} | Leerpunt: ${learnings}`;
}
