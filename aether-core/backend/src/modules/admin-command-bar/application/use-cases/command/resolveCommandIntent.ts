import { workflowEngine } from '../../../../../ai/orchestrator/WorkflowEngine';
import type { AgentRuntimePort } from '../../../../../ai/intelligence/agent-runtime/AgentRuntimePort';
import { matchIntent } from '../../services/command/matchIntent';

export interface ResolveCommandIntentDeps {
  agentRuntime: AgentRuntimePort;
}

export interface ResolveCommandIntentInput {
  tenantId: string;
  actorId?: string;
  naturalLanguage: string;
  contextSnippets: string[];
  memoryPromptBlock: string;
  workflowRunId?: string;
  proactiveContext?: {
    intentId?: string;
    evidence?: Record<string, unknown>;
  };
}

export async function resolveCommandIntent(
  deps: ResolveCommandIntentDeps,
  input: ResolveCommandIntentInput
) {
  const {
    tenantId,
    actorId,
    naturalLanguage,
    memoryPromptBlock,
    proactiveContext,
  } = input;

  let contextSnippets = input.contextSnippets;
  let workflowRunId = input.workflowRunId;

  const agentResult = await deps.agentRuntime.processCommand({
    tenantId,
    command: naturalLanguage,
    actorId,
    contextSnippets,
    memorySnippets: memoryPromptBlock ? [memoryPromptBlock] : undefined,
  });
  const parsedFromLlm = agentResult.parsed;
  const regexMatch = matchIntent(naturalLanguage);

  let parsed =
    parsedFromLlm.confidence >= 0.6 && parsedFromLlm.intent !== 'ERROR' && parsedFromLlm.intent !== 'UNKNOWN'
      ? { ...parsedFromLlm, action: parsedFromLlm.action ?? null }
      : regexMatch
        ? { ...regexMatch, action: null, confidence: 0.85, source: 'regex' as const }
        : parsedFromLlm.intent !== 'ERROR'
          ? { ...parsedFromLlm, action: parsedFromLlm.action ?? null, source: 'llm' as const }
          : { intent: 'UNKNOWN', action: null, parameters: {}, confidence: 0, source: 'none' as const };

  if (proactiveContext?.intentId) {
    parsed = {
      ...parsed,
      intent: proactiveContext.intentId,
      confidence: Math.max(parsed.confidence ?? 0, 0.9),
    };
  }
  if (proactiveContext?.evidence) {
    contextSnippets = [
      ...contextSnippets,
      `Proactive evidence: ${JSON.stringify(proactiveContext.evidence).slice(0, 500)}`,
    ];
  }

  const isLowConfidence = parsed.confidence < 0.6 || parsed.intent === 'UNKNOWN';
  if (isLowConfidence && !workflowRunId) {
    workflowRunId = await workflowEngine.startRun(tenantId, 'command.brain', {
      command: naturalLanguage,
      reason: 'low_confidence',
    });
  }
  if (workflowRunId) {
    await workflowEngine.addStep(workflowRunId, 'retrieve', 'completed', {
      snippetCount: contextSnippets.length,
    });
    await workflowEngine.addStep(workflowRunId, 'parse', 'completed', {
      intent: parsed.intent,
      confidence: parsed.confidence,
    });
  }

  return { parsed, contextSnippets, workflowRunId, agentResult };
}
