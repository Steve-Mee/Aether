import type { ExperienceReflection } from '../../personal-brain/reflection/types';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';

export interface LlmDistillationOutput {
  title: string;
  content: string;
  category: string;
  confidence: number;
}

export interface ReflectionDistillationOutput extends LlmDistillationOutput {
  sourceKind: 'reflection_distilled';
  provenance: { reflectionIds: string[]; agentKeys: string[] };
}

export class LlmDistillationAdapter {
  constructor(private llm: LlmInferencePort = defaultOllamaInference) {}

  async distillPattern(params: {
    intent: string;
    command: string;
    result: string;
  }): Promise<LlmDistillationOutput | null> {
    if (process.env.INTELLIGENCE_DISTILLATION_LLM !== 'true') {
      return null;
    }

    const prompt = `Generalize this merchant workflow into an anonymized global pattern. Remove all names, IDs, prices, SKUs.
Intent: ${params.intent}
Command: ${params.command.slice(0, 120)}
Result: ${params.result.slice(0, 300)}

Reply JSON only:
{"title":"...","content":"...","category":"pricing|conversion|inventory|marketing|trend","confidence":0.0-1.0}`;

    try {
      const raw = await this.llm.generate({ prompt, temperature: 0.2 });
      const parsed = JSON.parse(raw.trim()) as LlmDistillationOutput;
      if (!parsed.title || !parsed.content || parsed.confidence == null) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async distillReflections(params: {
    reflections: ExperienceReflection[];
    reflectionIds: string[];
    agentKeys: string[];
  }): Promise<ReflectionDistillationOutput | null> {
    if (process.env.INTELLIGENCE_DISTILLATION_LLM !== 'true') {
      return null;
    }

    const snippets = params.reflections.slice(0, 5).map((r) => ({
      intent: r.intent,
      goal: r.goal,
      outcome: r.outcome,
      learnings: r.futureLearnings.join('; '),
      blockers: r.couldImprove.join('; '),
    }));

    const prompt = `Distill these agent experience reflections into ONE anonymized global knowledge patch.
Remove merchant names, IDs, prices, emails. Generalize patterns only.
Reflections: ${JSON.stringify(snippets).slice(0, 2000)}

Reply JSON only:
{"title":"...","content":"...","category":"pricing|conversion|inventory|marketing|trend|operations","confidence":0.0-1.0}`;

    try {
      const raw = await this.llm.generate({ prompt, temperature: 0.2 });
      const parsed = JSON.parse(raw.trim()) as LlmDistillationOutput;
      if (!parsed.title || !parsed.content || parsed.confidence == null) return null;
      return {
        ...parsed,
        sourceKind: 'reflection_distilled',
        provenance: {
          reflectionIds: params.reflectionIds,
          agentKeys: params.agentKeys,
        },
      };
    } catch {
      return null;
    }
  }
}
