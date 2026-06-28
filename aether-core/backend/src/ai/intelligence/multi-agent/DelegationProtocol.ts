import crypto from 'crypto';
import type { HandoffPackage, ResumeToken } from './types';

export type DelegationPhase = 'request' | 'execute' | 'reflect' | 'return' | 'resume';

export interface DelegationProtocolState {
  phase: DelegationPhase;
  delegationId: string;
  parentRunId: string;
  childRunId?: string;
  handoffPackage?: HandoffPackage;
  resumeToken?: ResumeToken;
}

export class DelegationProtocol {
  createRequest(params: {
    parentRunId: string;
    sourceAgentKey: string;
    targetAgentKey: string;
    intent: string;
    contextSummary: string;
  }): { state: DelegationProtocolState; handoffPackage: HandoffPackage; resumeToken: ResumeToken } {
    const delegationId = crypto.randomUUID();
    const resumeToken: ResumeToken = {
      token: crypto.randomUUID(),
      parentRunId: params.parentRunId,
      delegationId,
      createdAt: new Date().toISOString(),
    };
    const handoffPackage: HandoffPackage = {
      sourceAgentKey: params.sourceAgentKey,
      targetAgentKey: params.targetAgentKey,
      reflectionIds: [],
      summary: params.contextSummary,
      constraints: [`intent:${params.intent}`],
      delegationId,
      resumeToken,
    };
    return {
      state: {
        phase: 'request',
        delegationId,
        parentRunId: params.parentRunId,
        handoffPackage,
        resumeToken,
      },
      handoffPackage,
      resumeToken,
    };
  }

  markExecute(state: DelegationProtocolState, childRunId: string): DelegationProtocolState {
    return { ...state, phase: 'execute', childRunId };
  }

  markReflect(state: DelegationProtocolState, reflectionIds: string[]): DelegationProtocolState {
    const handoffPackage = state.handoffPackage
      ? { ...state.handoffPackage, reflectionIds }
      : undefined;
    return { ...state, phase: 'reflect', handoffPackage };
  }

  buildReturnPackage(
    state: DelegationProtocolState,
    summary: string,
    reflectionIds: string[]
  ): HandoffPackage {
    return {
      sourceAgentKey: state.handoffPackage?.targetAgentKey ?? 'admin',
      targetAgentKey: state.handoffPackage?.sourceAgentKey ?? 'admin',
      reflectionIds,
      summary,
      delegationId: state.delegationId,
      resumeToken: state.resumeToken,
      constraints: state.handoffPackage?.constraints,
    };
  }

  markResume(state: DelegationProtocolState): DelegationProtocolState {
    return { ...state, phase: 'resume' };
  }

  buildResumeContextBlock(handoffPackage: HandoffPackage): string {
    const lines = [
      `[Delegation return from ${handoffPackage.sourceAgentKey}]`,
      handoffPackage.summary,
    ];
    if (handoffPackage.reflectionIds.length > 0) {
      lines.push(`Reflection refs: ${handoffPackage.reflectionIds.join(', ')}`);
    }
    return lines.join('\n');
  }
}
