import { explainabilityPersister } from './ExplainabilityPersister';
import type {
  ExplainabilityDiff,
  ExplainabilityPayload,
  ExplainabilitySourceType,
  FlowGraph,
  FlowGraphEdge,
  FlowGraphNode,
} from './types';

function labelSet(items: Array<{ label: string }>): Set<string> {
  return new Set(items.map((i) => i.label));
}

function diffLabels(left: Set<string>, right: Set<string>) {
  return {
    added: [...right].filter((l) => !left.has(l)),
    removed: [...left].filter((l) => !right.has(l)),
  };
}

function diffFlowGraph(left?: FlowGraph, right?: FlowGraph) {
  if (!left && !right) return undefined;
  const leftNodes = new Map((left?.nodes ?? []).map((n) => [n.id, n]));
  const rightNodes = new Map((right?.nodes ?? []).map((n) => [n.id, n]));
  const addedNodes: FlowGraphNode[] = [];
  const removedNodes: FlowGraphNode[] = [];
  for (const [id, node] of rightNodes) {
    if (!leftNodes.has(id) && node.type === 'agent') addedNodes.push(node);
  }
  for (const [id, node] of leftNodes) {
    if (!rightNodes.has(id) && node.type === 'agent') removedNodes.push(node);
  }
  const leftEdgeKeys = new Set((left?.edges ?? []).map((e) => `${e.source}->${e.target}`));
  const changedEdges: FlowGraphEdge[] = (right?.edges ?? []).filter(
    (e) => !leftEdgeKeys.has(`${e.source}->${e.target}`)
  );
  if (addedNodes.length === 0 && removedNodes.length === 0 && changedEdges.length === 0) {
    return undefined;
  }
  return { addedNodes, removedNodes, changedEdges };
}

function buildNarrativeHints(
  partial: Omit<ExplainabilityDiff, 'narrativeHints' | 'left' | 'right'>
): string[] {
  const hints: string[] = [];
  if (partial.agents.added.length > 0) {
    hints.push(`Deze keer ook betrokken: ${partial.agents.added.join(', ')}`);
  }
  if (partial.agents.removed.length > 0) {
    hints.push(`Eerder betrokken, nu niet: ${partial.agents.removed.join(', ')}`);
  }
  if (partial.triggerIdChanged) hints.push('Andere trigger dan de eerdere actie');
  if (partial.dataSourcesAdded.length > 0) {
    hints.push(`Extra databron: ${partial.dataSourcesAdded[0]}`);
  }
  return hints.slice(0, 5);
}

export class ExplainabilityDiffService {
  async diff(params: {
    tenantId: string;
    left: { sourceType: ExplainabilitySourceType; sourceId: string };
    right: { sourceType: ExplainabilitySourceType; sourceId: string };
  }): Promise<ExplainabilityDiff> {
    const leftSnap = await explainabilityPersister.getSnapshot(
      params.tenantId,
      params.left.sourceType,
      params.left.sourceId
    );
    const rightSnap = await explainabilityPersister.getSnapshot(
      params.tenantId,
      params.right.sourceType,
      params.right.sourceId
    );
    if (!leftSnap || !rightSnap) {
      throw new Error('Explainability snapshot not found');
    }

    const leftPayload = leftSnap.payload as unknown as ExplainabilityPayload;
    const rightPayload = rightSnap.payload as unknown as ExplainabilityPayload;
    const leftAgents = new Set(leftSnap.agentKeys);
    const rightAgents = new Set(rightSnap.agentKeys);

    const dsDiff = diffLabels(
      labelSet(leftPayload.dataSources),
      labelSet(rightPayload.dataSources)
    );
    const rsDiff = diffLabels(
      labelSet(leftPayload.reasoningSteps),
      labelSet(rightPayload.reasoningSteps)
    );

    const core = {
      summaryChanged: leftSnap.summary !== rightSnap.summary,
      agents: {
        added: [...rightAgents].filter((k) => !leftAgents.has(k)),
        removed: [...leftAgents].filter((k) => !rightAgents.has(k)),
        unchanged: [...leftAgents].filter((k) => rightAgents.has(k)),
      },
      triggerIdChanged: leftSnap.triggerId !== rightSnap.triggerId,
      intentIdChanged: leftSnap.intentId !== rightSnap.intentId,
      dataSourcesAdded: dsDiff.added,
      dataSourcesRemoved: dsDiff.removed,
      reasoningAdded: rsDiff.added,
      reasoningRemoved: rsDiff.removed,
      flowGraph: diffFlowGraph(
        (leftSnap.flowGraph as FlowGraph | null) ?? leftPayload.flowGraph,
        (rightSnap.flowGraph as FlowGraph | null) ?? rightPayload.flowGraph
      ),
    };

    return {
      left: {
        sourceType: leftSnap.sourceType,
        sourceId: leftSnap.sourceId,
        summary: leftSnap.summary,
      },
      right: {
        sourceType: rightSnap.sourceType,
        sourceId: rightSnap.sourceId,
        summary: rightSnap.summary,
      },
      ...core,
      narrativeHints: buildNarrativeHints(core),
    };
  }
}

export const explainabilityDiffService = new ExplainabilityDiffService();
