import type { PersonalBrainRegistry } from '../personal-brain/PersonalBrainRegistry';
import type { ReflectionAdaptiveHintService } from '../personal-brain/reflection/adaptive/ReflectionAdaptiveHintService';
import type { LearnedPreferenceHint } from './BrainActionPolicyResolver';
import { resolveMemoryAgentKey } from '../personal-brain/memory/agentKey';

interface ToolDecisionMemory {
  approved: boolean;
  tool: string;
  risk?: string;
}

function parseDecisionSnippet(content: string): ToolDecisionMemory | null {
  try {
    const parsed = JSON.parse(content) as ToolDecisionMemory;
    if (typeof parsed.approved === 'boolean' && typeof parsed.tool === 'string') {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export interface CombinedHintResult {
  hint: string | null;
  preferConfirm?: boolean;
}

export class BrainAdaptiveLearningService {
  constructor(
    private personalBrains: PersonalBrainRegistry,
    private reflectionAdaptive?: ReflectionAdaptiveHintService
  ) {}

  async recordDecision(
    tenantId: string,
    params: {
      tool: string;
      approved: boolean;
      risk: string;
      inputSummary: string;
      originalCommand?: string;
      agentKey?: string;
    }
  ): Promise<void> {
    const brain = this.personalBrains.get(tenantId, resolveMemoryAgentKey(params.agentKey));
    await brain.remember({
      command: `tool_decision:${params.tool}`,
      intent: params.tool,
      result: JSON.stringify({
        approved: params.approved,
        tool: params.tool,
        risk: params.risk,
        inputSummary: params.inputSummary,
        originalCommand: params.originalCommand,
      }),
    });
  }

  async getLearnedHint(
    tenantId: string,
    tool: string,
    query: string,
    agentKey?: string
  ): Promise<string | null> {
    const brain = this.personalBrains.get(tenantId, resolveMemoryAgentKey(agentKey));
    const recall = await brain.recall(`tool_decision:${tool} ${query}`, 10);
    let approved = 0;
    let rejected = 0;

    for (const snippet of recall.snippets) {
      const decision = parseDecisionSnippet(snippet);
      if (!decision || decision.tool !== tool) continue;
      if (decision.approved) approved += 1;
      else rejected += 1;
    }

    const total = approved + rejected;
    if (total < 2) return null;
    if (approved >= rejected * 2) {
      return 'Je keurde vergelijkbare acties meestal goed';
    }
    if (rejected >= approved * 2) {
      return 'Je wijst dit type actie meestal af';
    }
    return null;
  }

  async getCombinedHint(
    tenantId: string,
    params: { tool: string; query: string; intent?: string; agentKey?: string }
  ): Promise<CombinedHintResult> {
    const reflectionHints = this.reflectionAdaptive
      ? await this.reflectionAdaptive.getHintsFromReflections(tenantId, {
          tool: params.tool,
          intent: params.intent,
          command: params.query,
          agentKey: params.agentKey,
        })
      : null;

    if (reflectionHints?.preferConfirm) {
      const reflectionText =
        reflectionHints.hints.length > 0 ? reflectionHints.hints.join(' ') : null;
      return { hint: reflectionText, preferConfirm: true };
    }

    const approvalHint = await this.getLearnedHint(
      tenantId,
      params.tool,
      params.query,
      params.agentKey
    );

    if (reflectionHints?.hints.length) {
      const parts = [reflectionHints.hints.join(' '), approvalHint].filter(Boolean);
      return { hint: parts.join(' ') || null };
    }

    return { hint: approvalHint };
  }

  async getLearnedPreference(
    tenantId: string,
    tool: string,
    agentKey?: string
  ): Promise<LearnedPreferenceHint> {
    const reflectionHints = this.reflectionAdaptive
      ? await this.reflectionAdaptive.getHintsFromReflections(tenantId, { tool, agentKey })
      : null;
    if (reflectionHints?.preferConfirm) return 'prefer_confirm';

    const brain = this.personalBrains.get(tenantId, resolveMemoryAgentKey(agentKey));
    const recall = await brain.recall(`tool_decision:${tool}`, 8);
    let approved = 0;
    let rejected = 0;

    for (const snippet of recall.snippets) {
      const decision = parseDecisionSnippet(snippet);
      if (!decision || decision.tool !== tool) continue;
      if (decision.approved) approved += 1;
      else rejected += 1;
    }

    const total = approved + rejected;
    if (total < 3) return null;
    if (approved / total >= 0.75) return 'prefer_auto';
    if (rejected / total >= 0.75) return 'prefer_confirm';
    return null;
  }
}
