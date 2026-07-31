import crypto from 'crypto';
import { DEFAULT_BRAIN_AGENT_KEY } from '../../global-knowledge/constants';
import {
  createBrainAgentRun,
  getBrainAgentRunById,
  listChildBrainAgentRuns,
  updateBrainAgentRunDelegation,
} from '../../command-brain/BrainAgentRunStore';
import type {
  DelegationRecord,
  DelegationRequest,
  DelegationResult,
  HandoffPackage,
  ResumeFromChildInput,
  ResumeFromChildResult,
  SpecialistExecuteRequest,
  SpecialistExecuteResult,
} from '../types';
import type { OrchestratorDeps } from './orchestratorDeps';

export async function delegate(
  deps: OrchestratorDeps,
  request: DelegationRequest,
  executeSpecialist: (request: SpecialistExecuteRequest) => Promise<SpecialistExecuteResult>
): Promise<DelegationResult> {
  const delegationId = request.delegationId ?? crypto.randomUUID();
  const { resumeToken } = deps.protocol.createRequest({
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

  if (deps.specialistRunner) {
    try {
      await executeSpecialist({
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

export async function resumeFromChild(
  deps: OrchestratorDeps,
  input: ResumeFromChildInput
): Promise<ResumeFromChildResult> {
  const parent = await getBrainAgentRunById(input.parentRunId, input.tenantId);
  if (!parent) {
    return { resumed: false, contextBlock: '' };
  }

  const contextBlock = deps.protocol.buildResumeContextBlock(input.handoffPackage);
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

export async function listDelegations(
  _deps: OrchestratorDeps,
  tenantId: string,
  runId: string
): Promise<DelegationRecord[]> {
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

export function buildReturnPackage(
  deps: OrchestratorDeps,
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
  return deps.protocol.buildReturnPackage(state, summary, reflectionIds);
}
