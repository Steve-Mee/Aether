import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import type { ToolProposal } from '../personal-brain/tools/types';
import type { RunWorkingMemoryPort } from './memory/RunWorkingMemoryPort';
import { isRunMemoryEnabled } from './memory/runMemoryConfig';
import { resolvePrimaryAgentByPriority } from './AgentCollaborationPolicy';
import type { AutonomyPrefs } from '../../../shared/settings/autonomyTypes';
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

function detectConflicts(
  contributions: AgentContribution[],
  autonomyPrefs?: AutonomyPrefs,
): ActionConflict[] {
  const byEntity = new Map<string, Array<{ proposal: ToolProposal; agentKey: string }>>();

  for (const contribution of contributions) {
    for (const proposal of contribution.pendingActions ?? []) {
      const key = extractEntityKey(proposal);
      const existing = byEntity.get(key) ?? [];
      existing.push({ proposal, agentKey: contribution.agentKey });
      byEntity.set(key, existing);
    }
  }

  const conflicts: ActionConflict[] = [];
  for (const [, entries] of byEntity) {
    if (entries.length < 2) continue;
    const tools = [...new Set(entries.map((e) => e.proposal.tool))];

    if (autonomyPrefs) {
      const agentKeys = [...new Set(entries.map((e) => e.agentKey))];
      const winnerKey = resolvePrimaryAgentByPriority(agentKeys, autonomyPrefs);
      const winner = entries.find((e) => e.agentKey === winnerKey);
      if (winnerKey && winner && agentKeys.length > 1) {
        conflicts.push({
          description: `Agent prioriteit (${winnerKey}) koos voorstel: ${winner.proposal.tool}`,
          proposals: [winner.proposal],
          resolution: 'agent_priority',
        });
        continue;
      }
    }

    conflicts.push({
      description:
        tools.length > 1
          ? `Multiple agents proposed different actions (${tools.join(', ')})`
          : `Conflicting ${tools[0]} proposals for the same entity`,
      proposals: entries.map((e) => e.proposal),
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
  constructor(
    private llm: LlmInferencePort = defaultOllamaInference,
    private runMemory?: RunWorkingMemoryPort
  ) {}

  async aggregate(input: {
    command: string;
    results: Array<SpecialistExecuteResult | AgentBranchResult>;
    agentKeys: string[];
    fallbackNarrative?: string;
    tenantId?: string;
    runId?: string;
    autonomyPrefs?: AutonomyPrefs;
  }): Promise<AggregatedMultiAgentResult> {
    const contributions = buildContributions(input.results, input.agentKeys);
    const conflicts = detectConflicts(contributions, input.autonomyPrefs);

    let sharedMemorySummary: Record<string, unknown> | undefined;
    if (
      this.runMemory &&
      input.tenantId &&
      input.runId &&
      isRunMemoryEnabled()
    ) {
      try {
        sharedMemorySummary = await this.runMemory.buildSharedSnapshot(
          input.tenantId,
          input.runId
        );
      } catch {
        // Shared memory snapshot is best-effort
      }
    }

    const baseResult = {
      perAgentContributions: contributions,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      sharedMemorySummary,
    };

    if (contributions.length <= 1) {
      const only = contributions[0];
      return {
        narrative: input.fallbackNarrative ?? only?.summary ?? '',
        synthesisSource: 'concat',
        ...baseResult,
      };
    }

    const structured = buildStructuredNarrative(input.command, contributions, conflicts);

    if (!isResultSynthesisEnabled()) {
      return {
        narrative: structured,
        synthesisSource: 'structured',
        ...baseResult,
      };
    }

    const synthesized = await this.synthesizeWithLlm(
      input.command,
      contributions,
      conflicts,
      sharedMemorySummary
    );
    if (synthesized) {
      return {
        narrative: synthesized,
        synthesisSource: 'llm',
        ...baseResult,
      };
    }

    return {
      narrative: structured,
      synthesisSource: 'structured',
      ...baseResult,
    };
  }

  private async synthesizeWithLlm(
    command: string,
    contributions: AgentContribution[],
    conflicts: ActionConflict[],
    sharedMemorySummary?: Record<string, unknown>
  ): Promise<string | null> {
    const agentBlocks = contributions
      .map((c) => `- ${c.agentKey} (${c.status}): ${c.summary}`)
      .join('\n');

    const conflictBlock =
      conflicts.length > 0
        ? `\nConflicts:\n${conflicts.map((c) => `- ${c.description}`).join('\n')}`
        : '';

    const memoryBlock =
      sharedMemorySummary && Object.keys(sharedMemorySummary).length > 0
        ? `\nShared run memory:\n${JSON.stringify(sharedMemorySummary).slice(0, 1500)}`
        : '';

    const prompt = `Combineer de output van meerdere specialist agents tot één samenhangend actieplan voor de merchant.

Origineel commando: "${command}"

Agent bijdragen:
${agentBlocks}
${conflictBlock}${memoryBlock}

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
