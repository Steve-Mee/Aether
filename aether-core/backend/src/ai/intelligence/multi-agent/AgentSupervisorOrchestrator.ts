import crypto from 'crypto';
import { isMutatingIntent } from '../command-brain/BrainActionPolicyResolver';
import { emitStreamEvent } from '../command-brain/AgentStreamEvents';
import { wrapAgentEvent } from './agentStreamWrap';
import { humanizeHandoffReason, buildChainHandoffReason } from './peer/handoffReason';
import { peerContextToChainLine } from './peer/AgentPeerMessage';
import { isRunMemoryEnabled } from './memory/runMemoryConfig';
import type { RunWorkingMemoryPort } from './memory/RunWorkingMemoryPort';
import type { SharedMemoryBridge } from './memory/SharedMemoryBridge';
import { DEFAULT_BRAIN_AGENT_KEY } from '../global-knowledge/constants';
import type { ReflectionMetricsRecorder } from '../personal-brain/reflection/ReflectionMetricsRecorder';
import type { PersonalBrainMemoryService } from '../personal-brain/memory/PersonalBrainMemoryService';
import {
  createBrainAgentRun,
  getBrainAgentRunById,
  listChildBrainAgentRuns,
  updateBrainAgentRunDelegation,
} from '../command-brain/BrainAgentRunStore';
import type { AgentSupervisorPort } from './AgentSupervisorPort';
import type { AgentRegistry } from './AgentRegistry';
import type { AgentRouterService } from './AgentRouterService';
import { DelegationProtocol } from './DelegationProtocol';
import type { ParallelCoordinator } from './ParallelCoordinator';
import type { GraphOrchestratorPort } from './graph/GraphOrchestratorPort';
import type { GraphExecutionRequest, GraphExecutionResult } from './graph/GraphOrchestratorPort';
import { isGraphOrchestrationEnabled } from './graph/graphOrchestrationConfig';
import type { SpecialistAgentRunner } from './SpecialistAgentRunner';
import { compoundToExecutionPlan } from './PlanNodeBuilder';
import {
  isMultiAgentDelegationEnabled,
  resolveDelegationTarget,
} from './delegationConfig';
import {
  needsSupplierIntel as collaborationNeedsSupplierIntel,
  resolvePrependChainForPrimary,
} from './AgentCollaborationPolicy';
import type {
  DelegationRecord,
  DelegationRequest,
  DelegationResult,
  ExecutionPlan,
  HandoffPackage,
  ParallelSpecialistRequest,
  ParallelSpecialistResult,
  ResumeFromChildInput,
  ResumeFromChildResult,
  RouteDecision,
  SpecialistAgentDefinition,
  SpecialistExecuteRequest,
  SpecialistExecuteResult,
} from './types';

export interface ChainHandoffInput {
  tenantId: string;
  fromAgentKey: string;
  toAgentKey: string;
  intent: string;
  command: string;
  context: string[];
  parentRunId?: string;
  actorId?: string;
  peerDepth?: number;
  abortSignal?: AbortSignal;
  contextPayload?: import('./types').AgentPeerMessage;
  correlationId?: string;
}

export class AgentOrchestrator implements AgentSupervisorPort {
  private protocol = new DelegationProtocol();

  constructor(
    private agentRegistry: AgentRegistry,
    private specialistRunner?: SpecialistAgentRunner,
    private personalBrainMemory?: PersonalBrainMemoryService,
    private agentRouter?: AgentRouterService,
    private parallelCoordinator?: ParallelCoordinator,
    private graphOrchestrator?: GraphOrchestratorPort,
    private reflectionMetrics?: ReflectionMetricsRecorder,
    private runMemory?: RunWorkingMemoryPort,
    private sharedMemoryBridge?: SharedMemoryBridge
  ) {}

  isDelegationEnabled(): boolean {
    return isMultiAgentDelegationEnabled();
  }

  isGraphOrchestrationEnabled(): boolean {
    return this.graphOrchestrator?.isEnabled() ?? isGraphOrchestrationEnabled();
  }

  async route(
    intent: string,
    command?: string,
    options?: { confidence?: number; onEvent?: SpecialistExecuteRequest['onEvent'] }
  ): Promise<SpecialistAgentDefinition | null> {
    const decision = await this.routeDecision(intent, command, options);
    return decision.agent;
  }

  async routeDecision(
    intent: string,
    command?: string,
    options?: { confidence?: number; tenantId?: string; onEvent?: SpecialistExecuteRequest['onEvent'] }
  ): Promise<RouteDecision> {
    if (!isMultiAgentDelegationEnabled()) {
      return { agent: null, agentKey: null, confidence: 0, reason: 'disabled', source: 'none' };
    }

    if (this.agentRouter && command) {
      return this.agentRouter.route({ intent, command, confidence: options?.confidence, tenantId: options?.tenantId });
    }

    const agent = this.agentRegistry.resolve(intent, command) ?? null;
    return {
      agent,
      agentKey: agent?.agentKey ?? null,
      confidence: agent ? 1 : 0,
      reason: agent ? `intent:${intent}` : 'no match',
      source: agent ? 'intent' : 'none',
    };
  }

  async routePlan(
    intent: string,
    command?: string,
    options?: { confidence?: number; tenantId?: string }
  ): Promise<ExecutionPlan> {
    if (!isMultiAgentDelegationEnabled()) {
      return { mode: 'single', agents: [], routingSource: 'none', routingReason: 'disabled' };
    }

    if (this.agentRouter && command) {
      return this.agentRouter.routePlan({
        intent,
        command,
        confidence: options?.confidence,
        tenantId: options?.tenantId,
      });
    }

    const agent = this.agentRegistry.resolve(intent, command);
    return {
      mode: 'single',
      agents: agent ? [{ agentKey: agent.agentKey, intent }] : [],
      routingSource: agent ? 'intent' : 'none',
      routingReason: agent ? `intent:${intent}` : 'no match',
    };
  }

  resolveTargetAgent(intent: string): string | null {
    const fromRegistry = this.agentRegistry.resolveByIntent(intent);
    if (fromRegistry) return fromRegistry.agentKey;
    return resolveDelegationTarget(intent);
  }

  resolveExecutionPlan(
    command: string,
    intent: string,
    subGoals?: Array<{ intent: string; command: string }>,
    connector: 'sequential' | 'parallel' = 'sequential'
  ): ExecutionPlan {
    if (intent === 'COMPOUND_WORKFLOW' && subGoals?.length) {
      return compoundToExecutionPlan(subGoals, this.agentRegistry, connector);
    }

    const single = this.agentRegistry.resolve(intent, command);
    return {
      mode: 'single',
      agents: single ? [{ agentKey: single.agentKey, intent }] : [],
    };
  }

  needsSupplierIntel(command: string, intent: string): boolean {
    return collaborationNeedsSupplierIntel(command, intent);
  }

  async executeParallel(request: ParallelSpecialistRequest): Promise<ParallelSpecialistResult> {
    if (!this.parallelCoordinator) {
      return {
        results: [],
        mergedNarrative: '',
        mergedToolTrace: [],
        pendingActions: [],
        agentRunIds: [],
      };
    }
    const result = await this.parallelCoordinator.executeParallel(request);

    if (
      this.sharedMemoryBridge &&
      request.parentRunId &&
      isRunMemoryEnabled() &&
      result.results.length > 0
    ) {
      const contributions = result.results.map((r) => ({
        agentKey: r.agentKey,
        summary: r.narrative?.slice(0, 200) ?? r.error ?? 'No output',
        status: (r.status === 'failed' || r.error ? 'failed' : 'completed') as 'completed' | 'failed',
      }));
      await this.sharedMemoryBridge.recordContributions({
        tenantId: request.tenantId,
        runId: request.parentRunId,
        contributions,
        onEvent: request.onEvent,
      });
    }

    return result;
  }

  async executeSequential(
    requests: SpecialistExecuteRequest[]
  ): Promise<SpecialistExecuteResult[]> {
    const results: SpecialistExecuteResult[] = [];
    let chainContext: string[] = [];

    if (requests.length > 0) {
      emitStreamEvent(requests[0].onEvent, {
        type: 'agent_assigned',
        agentKey: requests.map((r) => r.agentKey).join(','),
        executionMode: 'sequential',
      });
    }

    for (const req of requests) {
      if (req.abortSignal?.aborted) {
        break;
      }

      emitStreamEvent(req.onEvent, {
        type: 'agent_started',
        agentKey: req.agentKey,
        executionMode: 'sequential',
      });

      const result = await this.executeSpecialistCore({
        ...req,
        chainContext: [...chainContext, ...(req.chainContext ?? [])],
        skipCollaborationChain: true,
      });
      results.push(result);

      emitStreamEvent(req.onEvent, {
        type: 'agent_completed',
        agentKey: req.agentKey,
        executionMode: 'sequential',
        error: result.error,
      });

      if (req.abortSignal?.aborted) {
        break;
      }
      if (result.narrative) {
        chainContext = [...chainContext, result.narrative];
      } else       if (result.error) {
        chainContext = [...chainContext, `[${req.agentKey} error] ${result.error}`];
      }
    }

    if (this.sharedMemoryBridge && requests[0]?.parentRunId && isRunMemoryEnabled()) {
      const contributions = results.map((r, i) => ({
        agentKey: requests[i]?.agentKey ?? 'admin',
        summary: r.narrative?.slice(0, 200) ?? r.error ?? 'No output',
        status: (r.error ? 'failed' : 'completed') as 'completed' | 'failed',
      }));
      await this.sharedMemoryBridge.recordContributions({
        tenantId: requests[0].tenantId,
        runId: requests[0].parentRunId!,
        contributions,
        onEvent: requests[0].onEvent,
      });
    }

    return results;
  }

  async executeGraph(request: GraphExecutionRequest): Promise<GraphExecutionResult> {
    if (!this.graphOrchestrator?.isEnabled()) {
      return { mode: 'single', mergedNarrative: '' };
    }
    return this.graphOrchestrator.executeGraph(request);
  }

  async executeSpecialist(
    request: SpecialistExecuteRequest
  ): Promise<SpecialistExecuteResult> {
    if (!this.specialistRunner) {
      return { narrative: request.handlerResult, error: 'Specialist runner not configured' };
    }

    const def =
      this.agentRegistry.get(request.agentKey) ??
      this.agentRegistry.resolve(request.intent, request.command);
    if (!def) {
      return { narrative: request.handlerResult, error: 'No specialist agent for intent' };
    }

    let chainContext: string[] = request.chainContext ?? [];
    if (!request.skipCollaborationChain) {
      chainContext = await this.executeCollaborationChain(def, request, chainContext);
    }

    return this.executeSpecialistCore({ ...request, chainContext });
  }

  private async executeCollaborationChain(
    def: SpecialistAgentDefinition,
    request: SpecialistExecuteRequest,
    chainContext: string[]
  ): Promise<string[]> {
    const prependChain = resolvePrependChainForPrimary(
      request.command,
      request.intent,
      def,
      this.agentRegistry
    );
    if (!prependChain || prependChain.mode !== 'prepend') {
      return chainContext;
    }

    let context = [...chainContext];
    for (const step of prependChain.steps) {
      const stepResult = await this.chainHandoff(
        {
          tenantId: request.tenantId,
          fromAgentKey: def.agentKey,
          toAgentKey: step.agentKey,
          intent: step.intent,
          command: step.command ?? request.command,
          context: request.contextSnippets,
          parentRunId: request.parentRunId,
          actorId: request.actorId,
        },
        request.onEvent
      );
      if (stepResult.narrative) {
        context = [...context, `[${step.agentKey} intel] ${stepResult.narrative}`];
      } else if (stepResult.error) {
        context = [
          ...context,
          `[${step.agentKey} warning] Chain step failed: ${stepResult.error} — continuing with ${def.agentKey}.`,
        ];
      }
    }
    return context;
  }

  private async executeSpecialistCore(
    request: SpecialistExecuteRequest
  ): Promise<SpecialistExecuteResult> {
    if (!this.specialistRunner) {
      return { narrative: request.handlerResult, error: 'Specialist runner not configured' };
    }

    const def =
      this.agentRegistry.get(request.agentKey) ??
      this.agentRegistry.resolve(request.intent, request.command);
    if (!def) {
      return { narrative: request.handlerResult, error: 'No specialist agent for intent' };
    }

    emitStreamEvent(request.onEvent, { type: 'agent_assigned', agentKey: def.agentKey });

    const chainContext: string[] = request.chainContext ?? [];

    const { handoffPackage, resumeToken } = this.protocol.createRequest({
      parentRunId: request.parentRunId ?? crypto.randomUUID(),
      sourceAgentKey: DEFAULT_BRAIN_AGENT_KEY,
      targetAgentKey: def.agentKey,
      intent: request.intent,
      contextSummary: request.contextSnippets.join('\n').slice(0, 500),
    });

    const result = await this.specialistRunner.runWithDefinition(def, {
      ...request,
      agentKey: def.agentKey,
      chainContext,
      handoffConstraints: handoffPackage.constraints,
      parentRunId: request.parentRunId,
      onEvent: wrapAgentEvent(request.onEvent, def.agentKey),
    });

    if (result.handoffPackage && request.parentRunId) {
      result.handoffPackage.delegationId = handoffPackage.delegationId;
      result.handoffPackage.resumeToken = resumeToken;
      const resume = await this.resumeFromChild({
        tenantId: request.tenantId,
        parentRunId: request.parentRunId,
        childRunId: result.agentRunId ?? '',
        handoffPackage: result.handoffPackage,
      });
      if (resume.contextBlock && this.sharedMemoryBridge && isRunMemoryEnabled()) {
        await this.sharedMemoryBridge.recordAgentCompletion({
          tenantId: request.tenantId,
          runId: request.parentRunId,
          agentKey: def.agentKey,
          narrative: result.narrative,
          resumeContextBlock: resume.contextBlock,
          onEvent: request.onEvent,
        });
      } else if (this.sharedMemoryBridge && isRunMemoryEnabled()) {
        await this.sharedMemoryBridge.recordAgentCompletion({
          tenantId: request.tenantId,
          runId: request.parentRunId,
          agentKey: def.agentKey,
          narrative: result.narrative,
          onEvent: request.onEvent,
        });
      }
    } else if (
      this.sharedMemoryBridge &&
      request.parentRunId &&
      isRunMemoryEnabled() &&
      result.narrative
    ) {
      await this.sharedMemoryBridge.recordAgentCompletion({
        tenantId: request.tenantId,
        runId: request.parentRunId,
        agentKey: def.agentKey,
        narrative: result.narrative,
        onEvent: request.onEvent,
      });
    }

    return result;
  }

  async chainHandoff(
    input: ChainHandoffInput,
    onEvent?: SpecialistExecuteRequest['onEvent']
  ): Promise<SpecialistExecuteResult> {
    const targetDef = this.agentRegistry.resolveByKey(input.toAgentKey);
    if (!targetDef || !this.specialistRunner) {
      return { narrative: '', error: `Cannot chain to agent ${input.toAgentKey}` };
    }

    emitStreamEvent(onEvent, { type: 'agent_assigned', agentKey: input.toAgentKey });
    emitStreamEvent(onEvent, {
      type: 'agent_handoff',
      fromAgentKey: input.fromAgentKey,
      toAgentKey: input.toAgentKey,
      handoffReason: humanizeHandoffReason(buildChainHandoffReason(input.intent)),
    });

    try {
      const started = Date.now();
      const chainContext = [...(input.context ?? [])];
      if (input.contextPayload) {
        chainContext.push(peerContextToChainLine(input.contextPayload));
      }

      const result = await this.specialistRunner.runWithDefinition(targetDef, {
        tenantId: input.tenantId,
        agentKey: input.toAgentKey,
        intent: input.intent,
        command: input.command,
        contextSnippets: chainContext,
        handlerResult: `Chained from ${input.fromAgentKey}`,
        parentRunId: input.parentRunId,
        actorId: input.actorId,
        handoffConstraints: [`chainFrom:${input.fromAgentKey}`],
        onEvent: wrapAgentEvent(onEvent, input.toAgentKey),
        abortSignal: input.abortSignal,
        peerDepth: input.peerDepth ?? 0,
        correlationId: input.correlationId,
      });
      void this.reflectionMetrics?.recordHandoffLatency(
        input.tenantId,
        Date.now() - started,
        input.parentRunId
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chain handoff failed';
      return { narrative: '', error: message };
    }
  }

  async delegate(request: DelegationRequest): Promise<DelegationResult> {
    const delegationId = request.delegationId ?? crypto.randomUUID();
    const { resumeToken } = this.protocol.createRequest({
      parentRunId: request.parentRunId,
      sourceAgentKey: DEFAULT_BRAIN_AGENT_KEY,
      targetAgentKey: request.targetAgentKey,
      intent: request.intent,
      contextSummary: request.context.join('\n').slice(0, 500),
    });

    const child = await createBrainAgentRun({
      tenantId: request.tenantId,
      transcript: [],
      agentKey: request.targetAgentKey,
      parentRunId: request.parentRunId,
      delegationId,
      delegationMeta: {
        reason: `delegate:${request.intent}`,
        resumeToken: resumeToken.token,
        handoffPackageId: delegationId,
      } as import('@prisma/client').Prisma.InputJsonValue,
    });

    if (this.specialistRunner) {
      try {
        await this.executeSpecialist({
          tenantId: request.tenantId,
          agentKey: request.targetAgentKey,
          intent: request.intent,
          command: request.command,
          contextSnippets: request.context,
          handlerResult: `Delegated: ${request.intent}`,
          parentRunId: request.parentRunId,
        });
      } catch {
        // Execution is best-effort for legacy delegate path
      }
    }

    return {
      childRunId: child.id,
      delegationId,
      status: 'running',
      agentKey: request.targetAgentKey,
    };
  }

  async resumeFromChild(input: ResumeFromChildInput): Promise<ResumeFromChildResult> {
    const parent = await getBrainAgentRunById(input.parentRunId, input.tenantId);
    if (!parent) {
      return { resumed: false, contextBlock: '' };
    }

    const contextBlock = this.protocol.buildResumeContextBlock(input.handoffPackage);
    await updateBrainAgentRunDelegation({
      id: input.parentRunId,
      tenantId: input.tenantId,
      delegationMeta: {
        ...(typeof parent.delegationMeta === 'object' && parent.delegationMeta
          ? (parent.delegationMeta as Record<string, unknown>)
          : {}),
        childSummary: input.handoffPackage.summary,
        reflectionIds: input.handoffPackage.reflectionIds,
        resumedAt: new Date().toISOString(),
      } as import('@prisma/client').Prisma.InputJsonValue,
    });

    return { resumed: true, contextBlock };
  }

  async listDelegations(tenantId: string, runId: string): Promise<DelegationRecord[]> {
    const parent = await getBrainAgentRunById(runId, tenantId);
    const children = await listChildBrainAgentRuns(tenantId, runId);
    const records: DelegationRecord[] = [];

    if (parent?.delegationId) {
      records.push({
        id: parent.id,
        tenantId,
        parentRunId: parent.parentRunId ?? '',
        childRunId: parent.id,
        delegationId: parent.delegationId,
        sourceAgentKey: DEFAULT_BRAIN_AGENT_KEY,
        targetAgentKey: parent.agentKey,
        status: parent.status,
        createdAt: parent.createdAt.toISOString(),
      });
    }

    for (const child of children) {
      records.push({
        id: child.id,
        tenantId,
        parentRunId: runId,
        childRunId: child.id,
        delegationId: child.delegationId ?? child.id,
        sourceAgentKey: DEFAULT_BRAIN_AGENT_KEY,
        targetAgentKey: child.agentKey,
        status: child.status,
        createdAt: child.createdAt.toISOString(),
      });
    }

    return records;
  }

  buildReturnPackage(
    parentRunId: string,
    targetAgentKey: string,
    summary: string,
    reflectionIds: string[]
  ): HandoffPackage {
    const state = {
      phase: 'reflect' as const,
      delegationId: crypto.randomUUID(),
      parentRunId,
      handoffPackage: {
        sourceAgentKey: targetAgentKey,
        targetAgentKey: DEFAULT_BRAIN_AGENT_KEY,
        reflectionIds: [],
        summary: '',
      },
    };
    return this.protocol.buildReturnPackage(state, summary, reflectionIds);
  }
}

/** @deprecated Use AgentOrchestrator */
export { AgentOrchestrator as AgentSupervisorOrchestrator };
