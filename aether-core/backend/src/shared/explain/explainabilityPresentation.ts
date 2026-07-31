import type {
  ExplainabilityDetailLevel,
  ExplainabilityPayload,
  ExplainabilitySection,
  ExplainabilitySourceType,
  FlowGraph,
  SimilarActionRef,
} from '../../ai/intelligence/explainability/types';
import { explainabilitySimilarityService } from '../../ai/intelligence/explainability/ExplainabilitySimilarityService';

export function payloadToSections(
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

export function snapshotFlowGraph(snapshot: {
  flowGraph: unknown;
  payload: unknown;
}): FlowGraph | undefined {
  if (snapshot.flowGraph) return snapshot.flowGraph as FlowGraph;
  const payload = snapshot.payload as ExplainabilityPayload;
  return payload.flowGraph;
}

export async function attachSimilarActions(
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

export function resolveUiDetailLevel(
  pref: ExplainabilityDetailLevel,
  stored: string
): 'simple' | 'extended' {
  if (pref === 'extended' || stored === 'extended') return 'extended';
  return 'simple';
}
