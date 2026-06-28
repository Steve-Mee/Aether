import type { AgentRunSummary } from '../../command-brain/types/AgentPlan';
import type { ExperienceReflectionService } from '../reflection/ExperienceReflectionService';
import { isMemoryReflectionEnabled } from './constants';
import type { LongTermMemoryStore } from './LongTermMemoryStore';
import type { ReflectionMemoryInput } from './types';

/** @deprecated Use ExperienceReflectionService via PersonalBrainMemoryService.recordExperienceReflection */
export class MemoryReflectionService {
  constructor(
    private longTerm: LongTermMemoryStore,
    private experienceReflection?: ExperienceReflectionService
  ) {}

  async extractAndStore(input: ReflectionMemoryInput): Promise<string[]> {
    if (!isMemoryReflectionEnabled()) return [];

    if (this.experienceReflection && input.trigger) {
      const result = await this.experienceReflection.reflectAndStore({
        tenantId: input.tenantId,
        command: input.command,
        intent: input.intent,
        summary: input.summary,
        plan: input.plan,
        toolTrace: input.toolTrace,
        stepReflections: input.reflections,
        trigger: input.trigger,
      });
      return result?.memoryIds ?? [];
    }

    return this.legacyExtractAndStore(input);
  }

  private async legacyExtractAndStore(input: ReflectionMemoryInput): Promise<string[]> {
    const lessons = await this.extractLessons(input);
    const ids: string[] = [];
    for (const lesson of lessons.slice(0, 3)) {
      const id = await this.longTerm.store({
        tenantId: input.tenantId,
        command: input.command,
        intent: input.intent,
        summary: lesson,
        priority: 'high',
        memoryKind: 'episodic',
        lessonLearned: true,
      });
      ids.push(id);
    }
    return ids;
  }

  private async extractLessons(input: ReflectionMemoryInput): Promise<string[]> {
    const reflectionText =
      input.reflections?.join('; ') ?? input.summary.reflections?.join('; ') ?? '';
    const tools = input.toolTrace?.map((t) => t.tool).join(', ') ?? '';
    const prompt = `Je bent het geheugen van een e-commerce merchant brein.
Extraheer 1-3 korte "lessons learned" (max 120 tekens elk) uit deze succesvolle agent run.
Geef JSON: { "lessons": ["...", "..."] }

Commando: ${input.command}
Doel bereikt: ${input.summary.goalReached}
Narratief: ${input.summary.narrative}
Tools: ${tools}
Reflecties: ${reflectionText}

Antwoord alleen met geldige JSON.`;

    try {
      const { defaultOllamaInference } = await import('../../../../shared/ai/OllamaInferenceAdapter');
      const text = await defaultOllamaInference.generate({ prompt, temperature: 0.2 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [input.summary.narrative.slice(0, 120)];
      const parsed = JSON.parse(jsonMatch[0]) as { lessons?: string[] };
      if (Array.isArray(parsed.lessons) && parsed.lessons.length > 0) {
        return parsed.lessons.map((l) => l.slice(0, 120));
      }
    } catch {
      // fallback
    }
    return [input.summary.narrative.slice(0, 120)];
  }
}
