import type { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';
import { DEFAULT_BRAIN_AGENT_KEY } from '../constants';
import { GlobalKnowledgePatchRepository } from '../GlobalKnowledgePatchRepository';
import { GlobalKnowledgeAdminService } from '../GlobalKnowledgeAdminService';
import {
  DistillationGovernance,
  DistillationSafetyClassifier,
  PatternGeneralizer,
} from './DistillationServices';
import { PatternOccurrenceStore } from './PatternOccurrenceStore';
import { LlmDistillationAdapter } from './LlmDistillationAdapter';

export interface DistillationResult {
  draftsCreated: number;
  skipped: number;
  autoPromoted: number;
}

export class KnowledgeDistillationService {
  private occurrenceStore = new PatternOccurrenceStore();
  private llmAdapter = new LlmDistillationAdapter();
  private adminService = new GlobalKnowledgeAdminService();

  constructor(
    private personalBrains: PersonalBrainRegistry,
    private repo = new GlobalKnowledgePatchRepository(),
    private classifier = new DistillationSafetyClassifier(),
    private generalizer = new PatternGeneralizer(),
    private governance = new DistillationGovernance()
  ) {}

  async distillFromTenant(tenantId: string): Promise<DistillationResult> {
    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 !== 'true') {
      return { draftsCreated: 0, skipped: 0, autoPromoted: 0 };
    }

    const brain = this.personalBrains.get(tenantId, DEFAULT_BRAIN_AGENT_KEY);
    const recall = await brain.recall('tool approval decision pattern', 30);

    let draftsCreated = 0;
    let skipped = 0;
    let autoPromoted = 0;

    for (const snippet of recall.snippets) {
      const match = /^\[(\w+)\]\s(.+?)\s→\s(.+)$/s.exec(snippet);
      if (!match) {
        skipped++;
        continue;
      }

      const [, intent, command, result] = match;
      let title = `Distilled ${intent} pattern`;
      let content = this.generalizer.generalize(intent!, command!, result!);
      let category = 'general';
      let confidence = 0.7;

      const llmOut = await this.llmAdapter.distillPattern({
        intent: intent!,
        command: command!,
        result: result!,
      });
      if (llmOut) {
        title = llmOut.title;
        content = llmOut.content;
        category = llmOut.category;
        confidence = llmOut.confidence;
      }

      const occurrenceCount = await this.occurrenceStore.increment(tenantId, intent!, content);
      const classification = await this.classifier.classifyWithNlp(content, occurrenceCount);

      if (!classification.safe) {
        skipped++;
        continue;
      }

      const patchKey = `distilled:${tenantId.slice(0, 8)}:${intent}:${Date.now()}`.slice(0, 64);
      const autoPromote = this.governance.canAutoPromote(
        content,
        occurrenceCount,
        Math.max(classification.score, confidence)
      );

      const row = await this.repo.create({
        patchKey,
        kind: 'pattern',
        category,
        title,
        content,
        priority: 5,
        minProfile: 'balanced',
        tags: ['distilled', intent!],
      });

      if (autoPromote && process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V4 === 'true') {
        await this.adminService.publishDistilledPatch(row.id, tenantId);
        autoPromoted++;
      }

      draftsCreated++;
    }

    return { draftsCreated, skipped, autoPromoted };
  }
}
