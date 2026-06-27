import crypto from 'crypto';
import { isMutatingIntent } from '../command-brain/BrainActionPolicyResolver';
import { emitStreamEvent } from '../command-brain/AgentStreamEvents';
import { DEFAULT_BRAIN_AGENT_KEY } from '../global-knowledge/constants';
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
import {
  isMultiAgentDelegationEnabled,
  resolveDelegationTarget,
} from './delegationConfig';
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

const SUPPLIER_INTEL_PATTERN =
  /\b(leverancier|supplier|inkoop|inkoopprijs|inkoopkosten|cost\s*price|purchase)\b/i;

export interface ChainHandoffInput {
  tenantId: string;
  fromAgentKey: string;
  toAgentKey: string;
  intent: string;
  command: string;
  context: string[];
  parentRunId?: string;
  actorId?: string;
}

export class AgentOrchestrator implements AgentSupervisorPort {
  private protocol = new DelegationProtocol();

  constructor(
    private agentRegistry: AgentRegistry,
    private specialistRunner?: SpecialistAgentRunner,
    private personalBrainMemory?: PersonalBrainMemoryService,
    private agentRouter?: AgentRouterService,
    private parallelCoordinator?: ParallelCoordinator,
    private graphOrchestrator?: GraphOrchestratorPort
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
    options?: { confidence?: number; onEvent?: SpecialistExecuteRequest['onEvent'] }
  ): Promise<RouteDecision> {
    if (!isMultiAgentDelegationEnabled()) {
      return { agent: null, agentKey: null, confidence: 0, reason: 'disabled', source: 'none' };
    }

    if (this.agentRouter && command) {
      return this.agentRouter.route({ intent, command, confidence: options?.confidence });
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

  resolveTargetAgent(intent: string): string | null {
    const fromRegistry = this.agentRegistry.resolveByIntent(intent);
    if (fromRegistry) return fromRegistry.agentKey;
    return resolveDelegationTarget(intent);
  }

  resolveExecutionPlan(
    command: string,
    intent: string,
    subGoals?: Array<{ intent: string; command: string }>
  ): ExecutionPlan {
    if (intent !== 'COMPOUND_WORKFLOW' || !subGoals?.length) {
      const single = this.agentRegistry.resolve(intent, command);
      return {
        mode: 'single',
        agents: single ? [{ agentKey: single.agentKey, intent }] : [],
      };
    }

    const agents = subGoals
      .map((step) => {
        const def = this.agentRegistry.resolveByIntent(step.intent);
        return def ? { agentKey: def.agentKey, intent: step.intent, command: step.command } : null;
      })
      .filter((a): a is { agentKey: string; intent: string; command: string } => a !== null);

    if (agents.length === 0) {
      return { mode: 'single', agents: [] };
    }

    const hasMutating = subGoals.some((s) => isMutatingIntent(s.intent));
    return {
      mode: hasMutating ? 'sequential' : 'parallel',
      agents,
    };
  }

  needsSupplierIntel(command: string, intent: string): boolean {
    if (intent !== 'PRICE_UPDATE' && intent !== 'PRICING_OPTIMIZE') return false;
    return SUPPLIER_INTEL_PATTERN.test(command);
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
    emitStreamEvent(request.onEvent, {
      type: 'agent_assigned',
      agentKey: request.agents.map((a) => a.agentKey).join(','),
    });
    return this.parallelCoordinator.executeParallel(request);
  }

  async executeSequential(
    requests: SpecialistExecuteRequest[]
  ): Promise<SpecialistExecuteResult[]> {
    const results: SpecialistExecuteResult[] = [];
    let chainContext: string[] = [];
    for (const req of requests) {
      const result = await this.executeSpecialist({
        ...req,
        chainContext: [...chainContext, ...(req.chainContext ?? [])],
      });
      results.push(result);
      if (result.narrative) {
        chainContext = [...chainContext, result.narrative];
      }
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

    emitStreamEvent(request.onEvent, { type: 'agent_assigned', agentKey: def.agentKey });

    let chainContext: string[] = request.chainContext ?? [];
    if (
      def.canDelegateTo?.includes('supplier') &&
      this.needsSupplierIntel(request.command, request.intent)
    ) {
      const supplierResult = await this.chainHandoff({
        tenantId: request.tenantId,
        fromAgentKey: def.agentKey,
        toAgentKey: 'supplier',
        intent: 'SUPPLIER_MONITOR',
        command: `Leveranciersprijzen ophalen voor pricing context: ${request.command}`,
        context: request.contextSnippets,
        parentRunId: request.parentRunId,
        actorId: request.actorId,
      });
      if (supplierResult.narrative) {
        chainContext = [...chainContext, `[Supplier intel] ${supplierResult.narrative}`];
      }
    }

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
    });

    if (result.handoffPackage && request.parentRunId) {
      result.handoffPackage.delegationId = handoffPackage.delegationId;
      result.handoffPackage.resumeToken = resumeToken;
      await this.resumeFromChild({
        tenantId: request.tenantId,
        parentRunId: request.parentRunId,
        childRunId: result.agentRunId ?? '',
        handoffPackage: result.handoffPackage,
      });
    }

    return result;
  }

  async chainHandoff(input: ChainHandoffInput): Promise<SpecialistExecuteResult> {
    const targetDef = this.agentRegistry.resolveByKey(input.toAgentKey);
    if (!targetDef || !this.specialistRunner) {
      return { narrative: '', error: `Cannot chain to agent ${input.toAgentKey}` };
    }

    return this.specialistRunner.runWithDefinition(targetDef, {
      tenantId: input.tenantId,
      agentKey: input.toAgentKey,
      intent: input.intent,
      command: input.command,
      contextSnippets: input.context,
      handlerResult: `Chained from ${input.fromAgentKey}`,
      parentRunId: input.parentRunId,
      actorId: input.actorId,
      handoffConstraints: [`chainFrom:${input.fromAgentKey}`],
    });
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
