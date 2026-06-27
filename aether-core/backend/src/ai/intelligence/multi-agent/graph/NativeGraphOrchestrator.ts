import { isMutatingIntent } from '../../command-brain/BrainActionPolicyResolver';
import type { AgentRegistry } from '../AgentRegistry';
import type { ParallelCoordinator } from '../ParallelCoordinator';
import type { SpecialistAgentRunner } from '../SpecialistAgentRunner';
import type { AgentPeerPort } from '../peer/AgentPeerPort';
import type { SpecialistExecuteRequest, SpecialistExecuteResult, ExecutionPlan } from '../types';
import { CollaborationGraphBuilder } from './CollaborationGraphBuilder';
import { isGraphOrchestrationEnabled } from './graphOrchestrationConfig';
import type {
  GraphExecutionRequest,
  GraphExecutionResult,
  GraphOrchestratorPort,
} from './GraphOrchestratorPort';
import { isGraphPeerEdgesEnabled } from './types';
import type { GraphDefinition, GraphNode } from './types';

export class NativeGraphOrchestrator implements GraphOrchestratorPort {
  private graphBuilder = new CollaborationGraphBuilder();

  constructor(
    private agentRegistry: AgentRegistry,
    private specialistRunner?: SpecialistAgentRunner,
    private parallelCoordinator?: ParallelCoordinator,
    private executeSequential?: (requests: SpecialistExecuteRequest[]) => Promise<SpecialistExecuteResult[]>,
    private peerBus?: AgentPeerPort
  ) {}

  setPeerBus(peerBus: AgentPeerPort): void {
    this.peerBus = peerBus;
  }

  isEnabled(): boolean {
    return isGraphOrchestrationEnabled();
  }

  buildGraphFromRequest(request: GraphExecutionRequest): GraphDefinition | null {
    if (!isGraphPeerEdgesEnabled()) return null;
    const plan: ExecutionPlan = {
      mode: request.agents.length > 1 ? 'sequential' : 'single',
      agents: request.agents.map((a) => ({
        agentKey: a.agentKey,
        intent: a.intent,
        command: request.command,
      })),
    };
    const subGoals = request.subGoals ?? request.agents.map((a) => ({ intent: a.intent, command: request.command }));
    const hasMutating = subGoals.some((s) => isMutatingIntent(s.intent));
    if (request.agents.length > 1 && !hasMutating) {
      plan.mode = 'parallel';
    } else if (request.agents.length > 1) {
      plan.mode = 'sequential';
    }
    return this.graphBuilder.buildFromPlan(plan, request.command);
  }

  async executeGraph(request: GraphExecutionRequest): Promise<GraphExecutionResult> {
    const graphDef = request.graphDefinition ?? this.buildGraphFromRequest(request);

    const hasParallelFork = graphDef?.nodes.some((n) => n.kind === 'parallel_fork');
    if (hasParallelFork && this.parallelCoordinator) {
      return this.executeParallelGraphDefinition(request, graphDef!);
    }

    if (graphDef && isGraphPeerEdgesEnabled() && this.peerBus) {
      return this.executeGraphDefinition(request, graphDef);
    }

    return this.executeLegacy(request);
  }

  private async executeParallelGraphDefinition(
    request: GraphExecutionRequest,
    graphDef: GraphDefinition
  ): Promise<GraphExecutionResult> {
    const forkNode = graphDef.nodes.find((n) => n.kind === 'parallel_fork');
    if (!forkNode || !this.parallelCoordinator) {
      return { mode: 'parallel', mergedNarrative: '' };
    }

    const agentNodeIds = graphDef.edges.filter((e) => e.from === forkNode.id).map((e) => e.to);
    const agentNodes = agentNodeIds
      .map((id) => graphDef.nodes.find((n) => n.id === id))
      .filter((n): n is GraphNode & { agentKey: string; intent: string } =>
        Boolean(n?.kind === 'agent' && n.agentKey && n.intent)
      );

    const parallelResult = await this.parallelCoordinator.executeParallel({
      tenantId: request.tenantId,
      command: request.command,
      agents: agentNodes.map((n) => ({
        agentKey: n.agentKey,
        intent: n.intent,
        contextSnippets: request.contextSnippets ?? request.agents[0]?.contextSnippets ?? [],
      })),
      parentRunId: request.parentRunId,
      actorId: request.actorId,
      collectiveSnippets: request.collectiveSnippets,
      memoryPromptBlock: request.memoryPromptBlock,
      deferToTools: request.deferToTools,
      adaptiveLearningEnabled: request.adaptiveLearningEnabled,
      onEvent: request.onEvent,
      abortSignal: request.abortSignal,
    });

    return {
      mode: 'parallel',
      parallelResult,
      mergedNarrative: parallelResult.mergedNarrative,
    };
  }

  private async executeGraphDefinition(
    request: GraphExecutionRequest,
    graphDef: GraphDefinition
  ): Promise<GraphExecutionResult> {
    const narratives: string[] = [];
    const agentNodes = graphDef.nodes.filter((n) => n.kind === 'agent');
    const sequentialResults: SpecialistExecuteResult[] = [];

    for (const node of this.topologicalAgentNodes(graphDef)) {
      if (request.abortSignal?.aborted) break;

      if (node.kind === 'subgraph' && node.subgraph) {
        const subResult = await this.executeGraphDefinition(
          { ...request, graphDefinition: node.subgraph },
          node.subgraph
        );
        if (subResult.mergedNarrative) narratives.push(subResult.mergedNarrative);
        if (subResult.sequentialResults) sequentialResults.push(...subResult.sequentialResults);
        continue;
      }

      if (node.kind === 'peer' && node.targetAgentKey && this.peerBus) {
        const peerResult = await this.peerBus.requestPeerHandoff({
          tenantId: request.tenantId,
          sourceAgentKey: agentNodes[0]?.agentKey ?? 'admin',
          targetAgentKey: node.targetAgentKey,
          intent: node.intent ?? 'UNKNOWN',
          query: request.command,
          parentRunId: request.parentRunId,
          actorId: request.actorId,
          depth: 0,
          onEvent: request.onEvent,
        });
        if (peerResult.narrative) narratives.push(peerResult.narrative);
        continue;
      }

      if (node.kind !== 'agent' || !node.agentKey || !node.intent) continue;

      const def = this.agentRegistry.resolveByKey(node.agentKey);
      if (!def || !this.specialistRunner) continue;

      const stepCommand = node.command ?? request.command;
      const result = await this.specialistRunner.runWithDefinition(def, {
        tenantId: request.tenantId,
        agentKey: node.agentKey,
        intent: node.intent,
        command: stepCommand,
        contextSnippets: request.contextSnippets ?? request.agents[0]?.contextSnippets ?? [],
        handlerResult: `Graph node: ${node.intent}`,
        actorId: request.actorId,
        collectiveSnippets: request.collectiveSnippets,
        memoryPromptBlock: request.memoryPromptBlock,
        deferToTools: request.deferToTools,
        adaptiveLearningEnabled: request.adaptiveLearningEnabled,
        onEvent: request.onEvent,
        parentRunId: request.parentRunId,
        abortSignal: request.abortSignal,
      });
      if (result.narrative) narratives.push(result.narrative);
      sequentialResults.push(result);
    }

    const mode = graphDef.nodes.some((n) => n.kind === 'parallel_fork') ? 'parallel' : 'sequential';
    return {
      mode,
      sequentialResults,
      mergedNarrative: narratives.filter(Boolean).join('\n\n'),
    };
  }

  private topologicalAgentNodes(graphDef: GraphDefinition): GraphNode[] {
    const ordered: GraphNode[] = [];
    const visited = new Set<string>();
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = graphDef.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      if (node.kind === 'agent' || node.kind === 'peer' || node.kind === 'subgraph') ordered.push(node);
      for (const edge of graphDef.edges.filter((e) => e.from === nodeId)) {
        visit(edge.to);
      }
    };
    visit(graphDef.entryNodeId);
    return ordered;
  }

  private async executeLegacy(request: GraphExecutionRequest): Promise<GraphExecutionResult> {
    const subGoals = request.subGoals ?? request.agents.map((a) => ({ intent: a.intent, command: request.command }));
    const agents = subGoals
      .map((step) => {
        const def = this.agentRegistry.resolveByIntent(step.intent);
        return def
          ? { agentKey: def.agentKey, intent: step.intent, command: step.command }
          : null;
      })
      .filter((a): a is { agentKey: string; intent: string; command: string } => a !== null);

    if (agents.length === 0) {
      return { mode: 'single', mergedNarrative: '' };
    }

    const hasMutating = subGoals.some((s) => isMutatingIntent(s.intent));
    const mode = hasMutating ? 'sequential' : 'parallel';

    if (mode === 'parallel' && this.parallelCoordinator) {
      const parallelResult = await this.parallelCoordinator.executeParallel({
        ...request,
        agents: agents.map((a) => ({ agentKey: a.agentKey, intent: a.intent })),
      });
      return {
        mode: 'parallel',
        parallelResult,
        mergedNarrative: parallelResult.mergedNarrative,
      };
    }

    if (!this.executeSequential) {
      return { mode: 'sequential', mergedNarrative: '' };
    }

    const sequentialResults = await this.executeSequential(
      agents.map((a) => ({
        tenantId: request.tenantId,
        agentKey: a.agentKey,
        intent: a.intent,
        command: a.command,
        contextSnippets: request.contextSnippets ?? request.agents[0]?.contextSnippets ?? [],
        handlerResult: `Graph sub-task: ${a.intent}`,
        actorId: request.actorId,
        collectiveSnippets: request.collectiveSnippets,
        memoryPromptBlock: request.memoryPromptBlock,
        deferToTools: request.deferToTools,
        adaptiveLearningEnabled: request.adaptiveLearningEnabled,
        onEvent: request.onEvent,
        parentRunId: request.parentRunId,
        abortSignal: request.abortSignal,
      }))
    );

    return {
      mode: 'sequential',
      sequentialResults,
      mergedNarrative: sequentialResults.map((r) => r.narrative).filter(Boolean).join('\n\n'),
    };
  }
}
