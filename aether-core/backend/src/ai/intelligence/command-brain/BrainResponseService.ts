import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { BrainAgentLoop } from './BrainAgentLoop';
import type { BrainToolTraceEntry, ToolProposal } from '../personal-brain/tools/types';

export interface GenerateResponseInput {
  tenantId: string;
  command: string;
  parsedIntent: string;
  parameters: Record<string, unknown>;
  contextSnippets: string[];
  handlerResult: string;
  memoryPromptBlock?: string;
}

export interface GenerateResponseOutput {
  narrative: string;
  actionProposal?: string;
  error?: string;
  toolTrace?: BrainToolTraceEntry[];
}

import type { AgentStreamCallback } from './AgentStreamEvents';
import type { AgentPlan, AgentRunSummary } from './types/AgentPlan';

import type { CompoundStep } from '../agent-runtime/types';
import type { ExplainabilityCollector } from '../explainability/ExplainabilityCollector';

export interface GenerateResponseOptions {
  deferToTools?: boolean;
  adaptiveLearningEnabled?: boolean;
  actorId?: string;
  collectiveSnippets?: string[];
  onEvent?: AgentStreamCallback;
  commandId?: string;
  abortSignal?: AbortSignal;
  subGoals?: CompoundStep[];
  explainabilityCollector?: ExplainabilityCollector;
}

/**
 * Generates merchant-specific narrative — single-shot or via BrainAgentLoop for complex intents.
 */
export class BrainResponseService {
  constructor(
    private llm: LlmInferencePort = defaultOllamaInference,
    private agentLoop?: BrainAgentLoop
  ) {}

  setAgentLoop(agentLoop: BrainAgentLoop): void {
    this.agentLoop = agentLoop;
  }

  async generateResponse(
    input: GenerateResponseInput,
    options?: GenerateResponseOptions
  ): Promise<
    GenerateResponseOutput & {
      toolTrace?: BrainToolTraceEntry[];
      pendingActions?: ToolProposal[];
      autoExecuted?: Array<{ proposalId: string; result: string }>;
      agentRunId?: string;
      transcript?: unknown[];
      checkpoint?: boolean;
      awaitingApprovalId?: string;
      runStatus?: 'running' | 'completed' | 'failed' | 'awaiting_approval' | 'cancelled';
      plan?: AgentPlan;
      summary?: AgentRunSummary;
    }
  > {
    const useLoop =
      this.agentLoop?.shouldUseAgentLoop(input.parsedIntent, options?.deferToTools) ||
      ['PRICE_UPDATE', 'LOW_MARGIN_REPORT', 'UNKNOWN', 'COMPOUND_WORKFLOW'].includes(input.parsedIntent);

    if (useLoop && this.agentLoop) {
      try {
        return await this.agentLoop.run({
          ...input,
          deferToTools: options?.deferToTools,
          adaptiveLearningEnabled: options?.adaptiveLearningEnabled,
          actorId: options?.actorId,
          collectiveSnippets: options?.collectiveSnippets,
          onEvent: options?.onEvent,
          commandId: options?.commandId,
          abortSignal: options?.abortSignal,
          subGoals: options?.subGoals,
          explainabilityCollector: options?.explainabilityCollector,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Agent loop failed';
        return { narrative: input.handlerResult, error: message };
      }
    }

    return this.generateSingleShot(input, options);
  }

  private async generateSingleShot(
    input: GenerateResponseInput,
    options?: GenerateResponseOptions
  ): Promise<GenerateResponseOutput> {
    const contextBlock =
      input.contextSnippets.length > 0
        ? `\nRelevante merchant data:\n${input.contextSnippets.map((s) => `- ${s}`).join('\n')}\n`
        : '';
    const collectiveBlock =
      options?.collectiveSnippets?.length ?
        `\nCollectieve intelligence:\n${options.collectiveSnippets.map((s) => `- ${s}`).join('\n')}\n`
      : '';
    const memoryBlock = input.memoryPromptBlock ? `\n${input.memoryPromptBlock}\n` : '';

    const paramsBlock =
      Object.keys(input.parameters).length > 0
        ? `\nGeëxtraheerde parameters: ${JSON.stringify(input.parameters)}\n`
        : '';

    const prompt = `Je bent AETHER, het persoonlijke brein van een e-commerce merchant.
${contextBlock}${memoryBlock}${collectiveBlock}
Commando: "${input.command}"
Intent: ${input.parsedIntent}${paramsBlock}
Systeemactie resultaat: ${input.handlerResult}

Schrijf een kort, concreet antwoord in het Nederlands (2-4 zinnen) dat:
1. De merchant-specifieke context gebruikt (producten, prijzen, voorraad indien beschikbaar)
2. Het uitgevoerde of voorgestelde resultaat samenvat
3. Een duidelijk actievoorstel geeft indien van toepassing

Antwoord in dit JSON-formaat:
{
  "narrative": "jouw antwoord aan de merchant",
  "actionProposal": "optioneel kort actievoorstel (1 zin)"
}

Antwoord alleen met geldige JSON.`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.3 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { narrative?: string; actionProposal?: string };
        if (parsed.narrative) {
          return {
            narrative: parsed.narrative,
            actionProposal: parsed.actionProposal,
          };
        }
      }
      return { narrative: input.handlerResult };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Brain response generation failed';
      return { narrative: input.handlerResult, error: message };
    }
  }
}
