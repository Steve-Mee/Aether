import type { AgentStreamCallback, AgentStreamEvent } from '../command-brain/AgentStreamEvents';
import { emitStreamEvent } from '../command-brain/AgentStreamEvents';
import { HandoffChainCollector } from '../multi-agent/peer/HandoffChainCollector';
import { buildFlowGraph } from './buildFlowGraph';
import type {
  ExplainabilityAgentEntry,
  ExplainabilityDataSource,
  ExplainabilityLiveUpdate,
  ExplainabilityReasoningStep,
  ExplainabilityReflection,
  ExplainabilitySection,
} from './types';
import { agentExplainLabel } from './agentLabels';

const LIVE_THROTTLE_MS = 500;

const LIVE_EMIT_TYPES = new Set<AgentStreamEvent['type']>([
  'agent_started',
  'agent_handoff',
  'reflection',
  'tool_result',
  'shared_memory_updated',
]);

export class ExplainabilityCollector {
  readonly handoffChain = new HandoffChainCollector();

  readonly agents = new Map<string, ExplainabilityAgentEntry>();
  readonly dataSources: ExplainabilityDataSource[] = [];
  readonly reasoningSteps: ExplainabilityReasoningStep[] = [];
  readonly reflections: ExplainabilityReflection[] = [];
  readonly policyNotes: string[] = [];

  globalKnowledge?: { message?: string; snippetCount?: number };
  planReasoning?: string;
  executionMode?: 'single' | 'sequential' | 'parallel';

  private lastLiveEmitAt = 0;

  wrap(onEvent?: AgentStreamCallback): AgentStreamCallback | undefined {
    const handoffWrapped = this.handoffChain.wrap(onEvent);
    if (!handoffWrapped) return undefined;
    return (event: AgentStreamEvent) => {
      this.observe(event);
      handoffWrapped(event);
      if (LIVE_EMIT_TYPES.has(event.type)) {
        this.maybeEmitLiveUpdate(handoffWrapped);
      }
    };
  }

  private maybeEmitLiveUpdate(onEvent: AgentStreamCallback): void {
    const now = Date.now();
    if (now - this.lastLiveEmitAt < LIVE_THROTTLE_MS) return;
    this.lastLiveEmitAt = now;
    const live = this.buildLiveSnapshot();
    emitStreamEvent(onEvent, {
      type: 'explain_update',
      summary: live.summary,
      explainSections: live.sections,
      flowGraph: live.flowGraph,
    });
  }

  buildLiveSnapshot(): ExplainabilityLiveUpdate {
    const agentList = [...this.agents.values()];
    const labels = agentList.map((a) => a.label);
    let summary = 'AETHER verwerkt je verzoek…';
    if (labels.length === 1) {
      summary = `${labels[0]} is actief.`;
    } else if (labels.length > 1) {
      summary = `${labels.slice(0, 3).join(', ')} werken samen.`;
    }

    const sections: ExplainabilitySection[] = [];
    if (agentList.length > 0) {
      sections.push({
        id: 'agents',
        title: 'Actieve agents',
        items: agentList.map((a) => ({ label: a.label, detail: a.contribution })),
      });
    }
    if (this.reasoningSteps.length > 0) {
      sections.push({
        id: 'reasoning',
        title: 'Voortgang',
        items: this.reasoningSteps.slice(-5).map((s) => ({
          label: s.label,
          detail: s.detail,
        })),
      });
    }

    const chain = this.snapshotHandoffChain();
    const flowGraph =
      chain.length > 0 || agentList.length > 1
        ? buildFlowGraph({
            agents: agentList,
            handoffChain: chain,
            executionMode: this.executionMode,
          })
        : undefined;

    return { summary, sections, flowGraph };
  }

  observe(event: AgentStreamEvent): void {
    this.handoffChain.observe(event);

    if (event.executionMode) {
      this.executionMode = event.executionMode;
    }

    if (event.type === 'agent_assigned' && event.agentKey) {
      this.registerAgent(event.agentKey, 'specialist');
    }
    if (event.type === 'agent_started' && event.agentKey) {
      this.registerAgent(event.agentKey, 'specialist');
    }
    if (event.type === 'agent_completed' && event.agentKey) {
      this.registerAgent(event.agentKey, 'specialist', event.summary);
    }
    if (event.type === 'plan_ready' && event.goal) {
      this.reasoningSteps.push({
        label: 'Plan opgesteld',
        detail: event.goal,
        at: event.timestamp,
      });
    }
    if (event.type === 'step_progress' && event.stepStatus === 'done') {
      const stepLabel =
        event.steps && event.planStep != null
          ? event.steps[event.planStep - 1]?.label
          : undefined;
      if (stepLabel) {
        this.reasoningSteps.push({
          label: stepLabel,
          at: event.timestamp,
        });
      }
    }
    if (event.type === 'reflection' && event.observation) {
      this.reflections.push({
        observation: event.observation,
        nextAction: event.nextAction,
      });
    }
    if (event.type === 'tool_start' && event.tool) {
      this.reasoningSteps.push({
        label: `Tool: ${event.tool}`,
        at: event.timestamp,
      });
    }
    if (event.type === 'tool_result' && event.tool) {
      this.reasoningSteps.push({
        label: `Resultaat: ${event.tool}`,
        detail: event.output?.slice(0, 120),
        at: event.timestamp,
      });
    }
    if (event.type === 'global_knowledge_synced' && event.summary) {
      this.globalKnowledge = {
        message: event.summary,
        snippetCount: this.globalKnowledge?.snippetCount,
      };
    }
    if (event.type === 'shared_memory_updated' && event.namespace && event.key) {
      this.dataSources.push({
        kind: 'shared_memory',
        label: `Gedeeld geheugen: ${event.namespace}/${event.key}`,
        preview: event.valuePreview,
      });
    }
  }

  registerAgent(
    agentKey: string,
    role: ExplainabilityAgentEntry['role'],
    contribution?: string,
    reasoning?: string
  ): void {
    const existing = this.agents.get(agentKey);
    if (existing) {
      if (contribution) existing.contribution = contribution;
      if (reasoning) existing.reasoning = reasoning;
      return;
    }
    this.agents.set(agentKey, {
      agentKey,
      role,
      label: agentExplainLabel(agentKey),
      contribution,
      reasoning,
    });
  }

  registerPrimaryAgent(agentKey: string, reasoning?: string): void {
    this.registerAgent(agentKey, 'primary', undefined, reasoning);
  }

  registerDataSources(sources: ExplainabilityDataSource[]): void {
    for (const source of sources) {
      const duplicate = this.dataSources.some(
        (s) => s.kind === source.kind && s.label === source.label
      );
      if (!duplicate) {
        this.dataSources.push(source);
      }
    }
  }

  registerAgentContributions(
    contributions: Array<{ agentKey: string; summary: string }>
  ): void {
    for (const c of contributions) {
      this.registerAgent(c.agentKey, 'specialist', c.summary);
    }
  }

  addPolicyNote(note: string): void {
    if (!this.policyNotes.includes(note)) {
      this.policyNotes.push(note);
    }
  }

  setGlobalKnowledge(message: string, snippetCount?: number): void {
    this.globalKnowledge = { message, snippetCount };
  }

  setPlanReasoning(reasoning: string): void {
    this.planReasoning = reasoning;
  }

  snapshotHandoffChain() {
    return this.handoffChain.snapshot();
  }
}
