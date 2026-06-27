import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import type { ToolProposal } from '../personal-brain/tools/types';
import type {
  AgentBranchResult,
  AgentContribution,
  ActionConflict,
  AggregatedMultiAgentResult,
  SpecialistExecuteResult,
  SynthesisSource,
} from './types';

function isResultSynthesisEnabled(): boolean {
  return process.env.MULTI_AGENT_RESULT_SYNTHESIS === 'true';
}

const ENTITY_ID_KEYS = ['productId', 'supplierId', 'sku', 'product', 'supplier'] as const;

function extractEntityKey(proposal: ToolProposal): string {
  for (const key of ENTITY_ID_KEYS) {
    const val = proposal.payload[key];
    if (val != null && String(val).trim()) {
      return `${proposal.tool}:${key}:${String(val)}`;
    }
  }
  return `${proposal.tool}:global`;
}

function summarizeResult(result: SpecialistExecuteResult | AgentBranchResult, agentKey: string): string {
  const fromHandoff = result.handoffPackage?.summary;
  if (fromHandoff) return fromHandoff.slice(0, 200);
  if (result.narrative) return result.narrative.slice(0, 200);
  if (result.error) return `Error: ${result.error}`;
  return 'No output';
}

function buildContributions(
  results: Array<SpecialistExecuteResult | AgentBranchResult>,
  agentKeys: string[]
): AgentContribution[] {
  return results.map((r, i) => {
    const agentKey = 'agentKey' in r ? r.agentKey : (agentKeys[i] ?? 'admin');
    const status =
      'status' in r && r.status === 'failed' ? 'failed' : r.error ? 'failed' : 'completed';
    return {
      agentKey,
      summary: summarizeResult(r, agentKey),
      status,
      pendingActions: r.pendingActions,
    };
  });
}

function detectConflicts(contributions: AgentContribution[]): ActionConflict[] {
  const byEntity = new Map<string, ToolProposal[]>();

  for (const contribution of contributions) {
    for (const proposal of contribution.pendingActions ?? []) {
      const key = extractEntityKey(proposal);
      const existing = byEntity.get(key) ?? [];
      existing.push(proposal);
      byEntity.set(key, existing);
    }
  }

  const conflicts: ActionConflict[] = [];
  for (const [, proposals] of byEntity) {
    if (proposals.length < 2) continue;
    const tools = [...new Set(proposals.map((p) => p.tool))];
    conflicts.push({
      description:
        tools.length > 1
          ? `Multiple agents proposed different actions (${tools.join(', ')})`
          : `Conflicting ${tools[0]} proposals for the same entity`,
      proposals,
      resolution: 'user_choice',
    });
  }

  return conflicts;
}

function buildStructuredNarrative(
  command: string,
  contributions: AgentContribution[],
  conflicts: ActionConflict[]
): string {
  const sections = contributions.map((c) => {
    const statusLabel = c.status === 'failed' ? ' (failed)' : '';
    return `**${c.agentKey}**${statusLabel}: ${c.summary}`;
  });

  let narrative = `Combined analysis for: "${command}"\n\n${sections.join('\n\n')}`;

  if (conflicts.length > 0) {
    narrative += `\n\n⚠ Conflicting proposals detected (${conflicts.length}). Review each agent's suggestions before approving.`;
  }

  return narrative;
}

export class MultiAgentResultAggregator {
  constructor(private llm: LlmInferencePort = defaultOllamaInference) {}

  async aggregate(input: {
    command: string;
    results: Array<SpecialistExecuteResult | AgentBranchResult>;
    agentKeys: string[];
    fallbackNarrative?: string;
  }): Promise<AggregatedMultiAgentResult> {
    const contributions = buildContributions(input.results, input.agentKeys);
    const conflicts = detectConflicts(contributions);

    if (contributions.length <= 1) {
      const only = contributions[0];
      return {
        narrative: input.fallbackNarrative ?? only?.summary ?? '',
        perAgentContributions: contributions,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        synthesisSource: 'concat',
      };
    }

    const structured = buildStructuredNarrative(input.command, contributions, conflicts);

    if (!isResultSynthesisEnabled()) {
      return {
        narrative: structured,
        perAgentContributions: contributions,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        synthesisSource: 'structured',
      };
    }

    const synthesized = await this.synthesizeWithLlm(input.command, contributions, conflicts);
    if (synthesized) {
      return {
        narrative: synthesized,
        perAgentContributions: contributions,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        synthesisSource: 'llm',
      };
    }

    return {
      narrative: structured,
      perAgentContributions: contributions,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      synthesisSource: 'structured',
    };
  }

  private async synthesizeWithLlm(
    command: string,
    contributions: AgentContribution[],
    conflicts: ActionConflict[]
  ): Promise<string | null> {
    const agentBlocks = contributions
      .map((c) => `- ${c.agentKey} (${c.status}): ${c.summary}`)
      .join('\n');

    const conflictBlock =
      conflicts.length > 0
        ? `\nConflicts:\n${conflicts.map((c) => `- ${c.description}`).join('\n')}`
        : '';

    const prompt = `Combineer de output van meerdere specialist agents tot één samenhangend actieplan voor de merchant.

Origineel commando: "${command}"

Agent bijdragen:
${agentBlocks}
${conflictBlock}

Schrijf een kort, coherent antwoord in het Nederlands (max 400 woorden). Benoem conflicten expliciet als die er zijn. Geen JSON.`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.2 });
      const trimmed = text.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch {
      return null;
    }
  }
}

export function mergeParallelResult(
  aggregator: MultiAgentResultAggregator,
  command: string,
  parallelResult: {
    results: AgentBranchResult[];
    mergedNarrative: string;
  },
  agentKeys: string[]
): Promise<AggregatedMultiAgentResult> {
  return aggregator.aggregate({
    command,
    results: parallelResult.results,
    agentKeys,
    fallbackNarrative: parallelResult.mergedNarrative,
  });
}

export function mergeSequentialResults(
  aggregator: MultiAgentResultAggregator,
  command: string,
  results: SpecialistExecuteResult[],
  agentKeys: string[],
  fallbackNarrative: string
): Promise<AggregatedMultiAgentResult> {
  return aggregator.aggregate({
    command,
    results,
    agentKeys,
    fallbackNarrative,
  });
}

export type { SynthesisSource };
