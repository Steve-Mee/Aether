import type {
  ExplainabilityBuildContext,
  ExplainabilityDetailLevel,
  ExplainabilityPayload,
  ExplainabilityResponse,
  ExplainabilitySection,
  ExplainabilitySourceType,
  FlowGraph,
  SimilarActionRef,
} from '../ai/intelligence/explainability/types';
import { ExplainabilityBuilder } from '../ai/intelligence/explainability/ExplainabilityBuilder';
import { explainabilityPersister } from '../ai/intelligence/explainability/ExplainabilityPersister';
import { ExplainabilityCollector } from '../ai/intelligence/explainability/ExplainabilityCollector';
import { explainabilitySimilarityService } from '../ai/intelligence/explainability/ExplainabilitySimilarityService';
import { isExplainabilityLlmSummaryEnabled } from '../ai/intelligence/explainability/explainabilityConfig';
import {
  GlobalBrainContributor,
  RetrievalContributor,
} from '../ai/intelligence/explainability/contributors';
import { getMerchantSettings } from '../settings/TenantSettingsService';
import { requireTenantId } from '../tenant/tenantContext';
import { prisma } from '../prisma/client';
import { ACTION_LABELS } from '../audit/activityLabels';

function payloadToSections(
  payload: ExplainabilityPayload,
  detailLevel: 'simple' | 'extended',
  flowGraph?: FlowGraph | null
): ExplainabilitySection[] {
  const sections: ExplainabilitySection[] = [];

  sections.push({
    id: 'summary',
    title: 'Samenvatting',
    items: [{ label: payload.summary }],
  });

  if (detailLevel === 'extended' && flowGraph && flowGraph.nodes.length > 0) {
    sections.push({
      id: 'flow',
      title: 'Agent-samenwerking',
      items: [],
      flowGraph,
    });
  }

  if (payload.agents.length > 0) {
    sections.push({
      id: 'agents',
      title: 'Betrokken agents',
      items: payload.agents.map((a) => ({
        label: a.label,
        detail: a.contribution ?? a.reasoning,
        meta: a.role !== 'primary' ? a.role : undefined,
      })),
    });
  }

  if (payload.dataSources.length > 0) {
    sections.push({
      id: 'dataSources',
      title: 'Gebruikte data',
      items: payload.dataSources.map((d) => ({
        label: d.label,
        detail: detailLevel === 'extended' ? d.preview : undefined,
        meta: d.score != null ? `score ${d.score.toFixed(2)}` : d.kind,
      })),
    });
  }

  if (payload.reasoningSteps.length > 0) {
    sections.push({
      id: 'reasoning',
      title: 'Redenering',
      items: payload.reasoningSteps.map((s) => ({
        label: s.label,
        detail: s.detail,
        meta: s.at,
      })),
    });
  }

  if (detailLevel === 'extended' && payload.reflections.length > 0) {
    sections.push({
      id: 'reflections',
      title: 'Reflecties',
      items: payload.reflections.map((r) => ({
        label: r.observation,
        detail: r.nextAction,
      })),
    });
  }

  if (detailLevel === 'extended' && payload.handoffChain && payload.handoffChain.length > 0) {
    sections.push({
      id: 'handoffChain',
      title: 'Agent-overdrachten',
      items: payload.handoffChain.map((h) => ({
        label: `${h.from} → ${h.to}`,
        detail: h.reason,
        meta: h.mode,
      })),
    });
  }

  if (payload.policyNotes && payload.policyNotes.length > 0) {
    sections.push({
      id: 'policy',
      title: 'Beleid',
      items: payload.policyNotes.map((n) => ({ label: n })),
    });
  }

  return sections;
}

function snapshotFlowGraph(snapshot: {
  flowGraph: unknown;
  payload: unknown;
}): FlowGraph | undefined {
  if (snapshot.flowGraph) return snapshot.flowGraph as FlowGraph;
  const payload = snapshot.payload as ExplainabilityPayload;
  return payload.flowGraph;
}

async function attachSimilarActions(
  tenantId: string,
  snapshot: {
    sourceType: string;
    sourceId: string;
    agentKeys: string[];
    intentId: string | null;
    triggerId: string | null;
    createdAt: Date;
    summarySource: string;
  },
  prefs: { showSimilarActions?: boolean; showCrossTenantSimilarActions?: boolean }
): Promise<{ similarActions?: SimilarActionRef[]; llmSummaryPending?: boolean }> {
  const extras: { similarActions?: SimilarActionRef[]; llmSummaryPending?: boolean } = {};

  if (prefs.showSimilarActions !== false) {
    extras.similarActions = await explainabilitySimilarityService.findSimilar({
      tenantId,
      sourceType: snapshot.sourceType as ExplainabilitySourceType,
      sourceId: snapshot.sourceId,
      agentKeys: snapshot.agentKeys,
      triggerId: snapshot.triggerId,
      intentId: snapshot.intentId,
      includeGlobal: prefs.showCrossTenantSimilarActions === true,
    });
  }

  const ageMs = Date.now() - snapshot.createdAt.getTime();
  if (snapshot.summarySource === 'template' && ageMs < 30_000) {
    extras.llmSummaryPending = true;
  }

  return extras;
}

function resolveUiDetailLevel(
  pref: ExplainabilityDetailLevel,
  stored: string
): 'simple' | 'extended' {
  if (pref === 'extended' || stored === 'extended') return 'extended';
  return 'simple';
}

export async function buildExplainabilityTimeline(params: {
  tenantId: string;
  entityType: 'email' | 'approval' | 'command' | 'proactive_suggestion';
  entityId: string;
}): Promise<ExplainabilityResponse> {
  const tenantId = requireTenantId(params.tenantId, 'explainability');
  const settings = await getMerchantSettings(tenantId);

  if (params.entityType === 'command' || params.entityType === 'proactive_suggestion') {
    const sourceType: ExplainabilitySourceType =
      params.entityType === 'command' ? 'command' : 'proactive_suggestion';
    let snapshot = await explainabilityPersister.getSnapshot(
      tenantId,
      sourceType,
      params.entityId
    );

    if (!snapshot && params.entityType === 'proactive_suggestion') {
      snapshot = await explainabilityPersister.getSnapshot(
        tenantId,
        'proactive_auto',
        params.entityId
      );
    }

    if (snapshot) {
      const payload = snapshot.payload as unknown as ExplainabilityPayload;
      const uiLevel = resolveUiDetailLevel(
        settings.explainabilityPrefs.detailLevel,
        snapshot.detailLevel
      );
      const flowGraph = snapshotFlowGraph(snapshot);
      const extras = await attachSimilarActions(
        tenantId,
        snapshot,
        settings.explainabilityPrefs
      );
      return {
        entityType: params.entityType,
        entityId: params.entityId,
        detailLevel: uiLevel,
        summary: snapshot.summary,
        summarySource: snapshot.summarySource as 'template' | 'llm',
        sections: payloadToSections(payload, uiLevel, flowGraph),
        flowGraph: uiLevel === 'extended' ? flowGraph : undefined,
        ...extras,
      };
    }

    if (params.entityType === 'command') {
      const runs = await prisma.brainAgentRun.findMany({
        where: { tenantId, commandId: params.entityId },
        orderBy: { createdAt: 'asc' },
        take: 5,
      });
      if (runs.length > 0) {
        const agentKeys = runs.map((r) => r.agentKey);
        const summary = `Command uitgevoerd met ${agentKeys.length} agent-run(s).`;
        return {
          entityType: params.entityType,
          entityId: params.entityId,
          detailLevel: 'simple',
          summary,
          sections: [
            {
              id: 'agents',
              title: 'Betrokken agents',
              items: agentKeys.map((k) => ({ label: k })),
            },
          ],
        };
      }
    }

    throw new Error('Explainability snapshot not found');
  }

  if (params.entityType === 'email') {
    const email = await prisma.emailMessage.findFirst({
      where: { id: params.entityId, tenantId },
    });
    if (!email) throw new Error('Email not found');

    const audits = await prisma.auditLog.findMany({
      where: {
        tenantId,
        details: { contains: params.entityId },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    const events = [
      {
        at: email.createdAt.toISOString(),
        label: 'E-mail ontvangen',
        status: email.status,
        category: email.category,
      },
      ...audits.map((a) => ({
        at: a.createdAt.toISOString(),
        label: ACTION_LABELS[a.action] ?? a.action,
        module: a.module,
        actor: a.actor,
        details: typeof a.details === 'string' ? JSON.parse(a.details) : a.details,
      })),
    ];

    return {
      entityType: 'email',
      entityId: params.entityId,
      detailLevel: 'simple',
      summary: 'Tijdlijn van e-mailverwerking',
      sections: [],
      events,
    };
  }

  const approval = await prisma.approval.findFirst({
    where: { id: params.entityId, tenantId },
  });
  if (!approval) throw new Error('Approval not found');

  const audits = await prisma.auditLog.findMany({
    where: {
      tenantId,
      details: { contains: params.entityId },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  const events = [
    {
      at: approval.createdAt.toISOString(),
      label: 'Goedkeuring aangemaakt',
      module: approval.module,
      actionType: approval.actionType,
      status: approval.status,
    },
    ...audits.map((a) => ({
      at: a.createdAt.toISOString(),
      label: ACTION_LABELS[a.action] ?? a.action,
      module: a.module,
      actor: a.actor,
    })),
  ];

  return {
    entityType: 'approval',
    entityId: params.entityId,
    detailLevel: 'simple',
    summary: 'Tijdlijn van goedkeuringsproces',
    sections: [],
    events,
  };
}

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
    persistLevel: suggestionSnapshot?.detailLevel ?? 'simple',
    payload,
    agentKeys: payload.agents.map((a) => a.agentKey),
    triggerId: params.triggerId,
    flowGraph: payload.flowGraph,
  });
}
