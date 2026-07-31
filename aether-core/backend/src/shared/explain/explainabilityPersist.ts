import type {
  ExplainabilityBuildContext,
  ExplainabilityPayload,
  ExplainabilityPersistLevel,
} from '../../ai/intelligence/explainability/types';
import { ExplainabilityBuilder } from '../../ai/intelligence/explainability/ExplainabilityBuilder';
import { explainabilityPersister } from '../../ai/intelligence/explainability/ExplainabilityPersister';
import { ExplainabilityCollector } from '../../ai/intelligence/explainability/ExplainabilityCollector';
import { isExplainabilityLlmSummaryEnabled } from '../../ai/intelligence/explainability/explainabilityConfig';
import {
  GlobalBrainContributor,
  RetrievalContributor,
} from '../../ai/intelligence/explainability/contributors';
import { getMerchantSettings } from '../settings/TenantSettingsService';

export async function persistCommandExplainability(params: {
  tenantId: string;
  commandId: string;
  rootRunId?: string;
  collector: ExplainabilityCollector;
  contextSnippets: string[];
  recallMatches: Array<{ score: number }>;
  collectiveSnippetCount: number;
  globalKnowledgeMessage?: string;
  agentContributions?: Array<{ agentKey: string; summary: string }>;
  planReasoning?: string;
  executionMode?: 'single' | 'sequential' | 'parallel';
}): Promise<string | undefined> {
  const settings = await getMerchantSettings(params.tenantId);
  const builder = new ExplainabilityBuilder([
    new RetrievalContributor(params.contextSnippets, params.recallMatches),
    new GlobalBrainContributor(params.collectiveSnippetCount, params.globalKnowledgeMessage),
  ]);

  if (params.agentContributions) {
    params.collector.registerAgentContributions(params.agentContributions);
  }
  if (params.planReasoning) {
    params.collector.setPlanReasoning(params.planReasoning);
  }
  if (params.executionMode) {
    params.collector.executionMode = params.executionMode;
  }

  const ctx: ExplainabilityBuildContext = {
    agents: [...params.collector.agents.values()],
    dataSources: [...params.collector.dataSources],
    reasoningSteps: [...params.collector.reasoningSteps],
    reflections: [...params.collector.reflections],
    handoffChain: params.collector.snapshotHandoffChain(),
    globalKnowledge: params.collector.globalKnowledge,
    policyNotes: [...params.collector.policyNotes],
    planReasoning: params.collector.planReasoning,
    executionMode: params.collector.executionMode,
  };

  const { payload, persistLevel } = builder.build(ctx, settings.explainabilityPrefs.detailLevel);
  const agentKeys = payload.agents.map((a) => a.agentKey);
  const enqueueLlm =
    isExplainabilityLlmSummaryEnabled() &&
    settings.explainabilityPrefs.useLlmSummary === true &&
    persistLevel !== 'minimal';

  return explainabilityPersister.save({
    tenantId: params.tenantId,
    sourceType: 'command',
    sourceId: params.commandId,
    rootRunId: params.rootRunId,
    persistLevel,
    payload,
    agentKeys,
    flowGraph: payload.flowGraph,
    enqueueLlm,
  });
}

export async function persistProactiveExplainability(params: {
  tenantId: string;
  suggestionId: string;
  triggerId: string;
  agentKey?: string;
  title: string;
  evidence: Record<string, unknown>;
  goalId?: string;
  collector?: ExplainabilityCollector;
  detectionRunId?: string;
}): Promise<string | undefined> {
  const settings = await getMerchantSettings(params.tenantId);

  const base = ExplainabilityBuilder.buildFromProactiveEvidence({
    triggerId: params.triggerId,
    agentKey: params.agentKey,
    title: params.title,
    evidence: params.evidence,
    userPref: settings.explainabilityPrefs.detailLevel,
  });

  let payload = base.payload;
  let persistLevel = base.persistLevel;

  if (params.collector) {
    const builder = new ExplainabilityBuilder();
    const agentMap = new Map(base.payload.agents.map((a) => [a.agentKey, a]));
    for (const a of params.collector.agents.values()) {
      agentMap.set(a.agentKey, a);
    }
    const ctx: ExplainabilityBuildContext = {
      agents: [...agentMap.values()],
      dataSources: [...base.payload.dataSources, ...params.collector.dataSources],
      reasoningSteps: [
        ...base.payload.reasoningSteps,
        ...params.collector.reasoningSteps,
      ],
      reflections: params.collector.reflections,
      handoffChain: params.collector.snapshotHandoffChain(),
      globalKnowledge: params.collector.globalKnowledge,
      policyNotes: params.collector.policyNotes,
    };
    const merged = builder.build(ctx, settings.explainabilityPrefs.detailLevel);
    payload = merged.payload;
    persistLevel = merged.persistLevel;
  }

  const goalId =
    params.goalId ??
    (typeof params.evidence.goalId === 'string' ? params.evidence.goalId : undefined);

  const payloadWithGoal: ExplainabilityPayload = goalId
    ? { ...payload, goalId }
    : payload;

  return explainabilityPersister.save({
    tenantId: params.tenantId,
    sourceType: 'proactive_suggestion',
    sourceId: params.suggestionId,
    rootRunId: params.detectionRunId,
    persistLevel,
    payload: payloadWithGoal,
    agentKeys: payload.agents.map((a) => a.agentKey),
    triggerId: params.triggerId,
    goalId,
    flowGraph: payload.flowGraph,
    enqueueLlm:
      isExplainabilityLlmSummaryEnabled() &&
      settings.explainabilityPrefs.useLlmSummary === true &&
      persistLevel !== 'minimal',
  });
}

export async function persistProactiveAutoExplainability(params: {
  tenantId: string;
  suggestionId: string;
  commandId: string;
  triggerId: string;
  agentKey?: string;
  title: string;
}): Promise<string | undefined> {
  const settings = await getMerchantSettings(params.tenantId);
  if (settings.explainabilityPrefs.detailLevel === 'off') return undefined;

  const suggestionSnapshot = await explainabilityPersister.getSnapshot(
    params.tenantId,
    'proactive_suggestion',
    params.suggestionId
  );

  const base = suggestionSnapshot
    ? (suggestionSnapshot.payload as unknown as ExplainabilityPayload)
    : ExplainabilityBuilder.buildFromProactiveEvidence({
        triggerId: params.triggerId,
        agentKey: params.agentKey,
        title: params.title,
        evidence: {},
        userPref: settings.explainabilityPrefs.detailLevel,
      }).payload;

  const payload: ExplainabilityPayload = {
    ...base,
    summary: `${base.summary} Automatisch uitgevoerd als commando.`,
    linkedCommandId: params.commandId,
    linkedSuggestionId: params.suggestionId,
  };

  return explainabilityPersister.save({
    tenantId: params.tenantId,
    sourceType: 'proactive_auto',
    sourceId: params.suggestionId,
    persistLevel: (suggestionSnapshot?.detailLevel ?? 'simple') as ExplainabilityPersistLevel,
    payload,
    agentKeys: payload.agents.map((a) => a.agentKey),
    triggerId: params.triggerId,
    flowGraph: payload.flowGraph,
  });
}
