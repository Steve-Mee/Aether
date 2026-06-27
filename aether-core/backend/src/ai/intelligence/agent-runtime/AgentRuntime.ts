import type { CommandParserService } from '../../../modules/admin-command-bar/application/services/CommandParserService';
import { buildCollectiveContext } from '../global-knowledge/CollectiveContextBuilder';
import type { GlobalKnowledgeService } from '../global-knowledge/GlobalKnowledgeService';
import type { GlobalBrainPort } from '../global-brain/GlobalBrainPort';
import type { KnowledgeTransferPort } from '../knowledge-transfer/KnowledgeTransferPort';
import type { KnowledgeTransferGatePort } from '../knowledge-transfer/KnowledgeTransferGatePort';
import { DefaultKnowledgeTransferGate } from '../knowledge-transfer/DefaultKnowledgeTransferGate';
import type { PersonalBrainRegistry } from '../personal-brain/PersonalBrainRegistry';
import type { AgentRuntimePort } from './AgentRuntimePort';
import { tryParseCompound, isCompoundEnabled } from './CompoundCommandParser';
import type { CompoundStep, ParsedCommand, ProcessCommandInput, ProcessCommandOutput } from './types';

export class AgentRuntime implements AgentRuntimePort {
  constructor(
    private personalBrains: PersonalBrainRegistry,
    private parser: CommandParserService,
    private globalBrain?: GlobalBrainPort,
    private knowledgeTransfer?: KnowledgeTransferPort,
    private ktGate: KnowledgeTransferGatePort = new DefaultKnowledgeTransferGate(),
    private globalKnowledgeService?: GlobalKnowledgeService
  ) {}

  async processCommand(input: ProcessCommandInput): Promise<ProcessCommandOutput> {
    const brain = this.personalBrains.get(input.tenantId, 'admin');

    let contextSnippets = input.contextSnippets;
    if (!contextSnippets) {
      const recall = await brain.recall(input.command);
      contextSnippets = recall.snippets;
    }

    const brainContext = await brain.getContext();

    const collective = await buildCollectiveContext({
      tenantId: input.tenantId,
      globalBrain: this.globalBrain,
      knowledgeTransfer: this.knowledgeTransfer,
      globalKnowledgeService: this.globalKnowledgeService,
      ktGate: this.ktGate,
      syncGlobalKnowledge: false,
    });

    let compound = tryParseCompound(input.command);
    if (!compound && isCompoundEnabled()) {
      compound = await this.parser.tryDetectCompound(input.command);
    }
    let parsed: ParsedCommand;

    if (compound) {
      const steps: CompoundStep[] = [];
      for (let i = 0; i < compound.parts.length; i++) {
        const part = compound.parts[i]!;
        const llmResult = await this.parser.parseCommand(part, {
          contextSnippets,
          collectiveSnippets: collective.merchantCollective,
          globalKnowledgeSnippets: collective.globalKnowledgeSnippets,
          knowledgeUpdateSnippets: collective.knowledgeUpdateSnippets,
          brainContext,
        });
        steps.push({
          index: i + 1,
          command: part,
          intent: String(llmResult.intent ?? 'UNKNOWN'),
          parameters: (llmResult.parameters as Record<string, unknown>) ?? {},
          confidence: Number(llmResult.confidence ?? 0),
        });
      }
      parsed = {
        intent: 'COMPOUND_WORKFLOW',
        action: null,
        parameters: { stepCount: steps.length },
        confidence: Math.min(...steps.map((s) => s.confidence)),
        source: 'llm',
        compound: { steps, connector: 'sequential' },
      };
    } else {
      const llmResult = await this.parser.parseCommand(input.command, {
        contextSnippets,
        memorySnippets: input.memorySnippets,
        collectiveSnippets: collective.merchantCollective,
        globalKnowledgeSnippets: collective.globalKnowledgeSnippets,
        knowledgeUpdateSnippets: collective.knowledgeUpdateSnippets,
        brainContext,
      });
      parsed = {
        intent: String(llmResult.intent ?? 'UNKNOWN'),
        action: llmResult.action ?? null,
        parameters: (llmResult.parameters as Record<string, unknown>) ?? {},
        confidence: Number(llmResult.confidence ?? 0),
        source: 'llm',
      };
    }

    await brain.updateAgentState({
      lastIntent: parsed.intent,
      lastCommandAt: new Date().toISOString(),
    });

    const actionProposal =
      contextSnippets.length > 0 || collective.allSnippets.length > 0
        ? `Context from ${contextSnippets.length} personal + ${collective.merchantCollective.length} collective + ${collective.globalKnowledgeSnippets.length} global snippet(s).`
        : undefined;

    return {
      parsed,
      contextSnippets,
      actionProposal,
    };
  }
}
