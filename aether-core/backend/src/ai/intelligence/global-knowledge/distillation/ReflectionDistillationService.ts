import type { LongTermMemoryStore } from '../../personal-brain/memory/LongTermMemoryStore';
import { GlobalKnowledgePatchRepository } from '../GlobalKnowledgePatchRepository';
import {
  DistillationSafetyClassifier,
  PatternGeneralizer,
} from './DistillationServices';
import { PatternOccurrenceStore } from './PatternOccurrenceStore';
import { LlmDistillationAdapter } from './LlmDistillationAdapter';
import type { ExperienceReflection } from '../../personal-brain/reflection/types';

export interface ReflectionDistillationResult {
  draftsCreated: number;
  skipped: number;
}

export class ReflectionDistillationService {
  private occurrenceStore = new PatternOccurrenceStore();
  private llmAdapter = new LlmDistillationAdapter();
  private generalizer = new PatternGeneralizer();

  constructor(
    private longTerm: LongTermMemoryStore,
    private repo = new GlobalKnowledgePatchRepository(),
    private classifier = new DistillationSafetyClassifier()
  ) {}

  async distillFromReflections(tenantId: string): Promise<ReflectionDistillationResult> {
    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 !== 'true') {
      return { draftsCreated: 0, skipped: 0 };
    }
    if (process.env.PERSONAL_BRAIN_REFLECTION_DISTILLATION_ENABLED === 'false') {
      return { draftsCreated: 0, skipped: 0 };
    }

    let draftsCreated = 0;
    let skipped = 0;

    const agentKeys = ['admin', 'mail', 'supplier'];
    const batchReflections: ExperienceReflection[] = [];
    const batchIds: string[] = [];
    const batchAgentKeys: string[] = [];

    for (const agentKey of agentKeys) {
      const reflections = await this.longTerm.listReflections(tenantId, 30, agentKey);
      for (const match of reflections) {
        if (!match.reflectionPayload || match.consolidatedAt) {
          skipped++;
          continue;
        }
        const payload = match.reflectionPayload;
        const isHighValue =
          !payload.success ||
          payload.trigger === 'high_impact' ||
          payload.futureLearnings.length > 0;
        if (!isHighValue) {
          skipped++;
          continue;
        }
        batchReflections.push(payload);
        batchIds.push(match.id);
        batchAgentKeys.push(agentKey);
      }
    }

    if (batchReflections.length === 0) {
      return { draftsCreated: 0, skipped };
    }

    const intent = batchReflections[0]!.intent;
    let title = `Reflection pattern: ${intent}`;
    let content = this.generalizer.generalize(
      intent,
      batchReflections[0]!.command,
      batchReflections[0]!.outcome
    );
    let category = 'operations';
    let confidence = 0.65;

    const llmOut = await this.llmAdapter.distillReflections({
      reflections: batchReflections,
      reflectionIds: batchIds,
      agentKeys: [...new Set(batchAgentKeys)],
    });
    if (llmOut) {
      title = llmOut.title;
      content = llmOut.content;
      category = llmOut.category;
      confidence = llmOut.confidence;
    }

    const occurrenceCount = await this.occurrenceStore.increment(tenantId, intent, content);
    const classification = await this.classifier.classifyReflectionContent(content, occurrenceCount);

    if (!classification.safe) {
      skipped += batchReflections.length;
      return { draftsCreated: 0, skipped };
    }

    const patchKey = `reflection:${tenantId.slice(0, 8)}:${intent}:${Date.now()}`.slice(0, 64);
    await this.repo.create({
      patchKey,
      kind: 'pattern',
      category,
      title,
      content,
      priority: 4,
      minProfile: 'balanced',
      tags: ['reflection_distilled', intent, ...new Set(batchAgentKeys)],
      payload: {
        sourceKind: 'reflection_distilled',
        provenance: { reflectionIds: batchIds, agentKeys: [...new Set(batchAgentKeys)] },
        confidence: Math.max(classification.score, confidence),
      },
    });

    draftsCreated++;
    return { draftsCreated, skipped };
  }
}
