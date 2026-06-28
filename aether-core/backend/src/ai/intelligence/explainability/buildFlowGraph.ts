import type { HandoffChainEntry } from '../multi-agent/types';
import type {
  ExplainabilityAgentEntry,
  ExplainabilityBuildContext,
  FlowGraph,
  FlowGraphEdge,
  FlowGraphNode,
} from './types';
import { agentExplainLabel } from './agentLabels';

const NODE_X_GAP = 180;
const NODE_Y_GAP = 100;

function uniqueAgentKeys(agents: ExplainabilityAgentEntry[], handoffChain: HandoffChainEntry[]): string[] {
  const keys = new Set<string>();
  for (const a of agents) keys.add(a.agentKey);
  for (const h of handoffChain) {
    keys.add(h.from);
    keys.add(h.to);
  }
  return [...keys];
}

export function buildFlowGraph(ctx: Pick<ExplainabilityBuildContext, 'agents' | 'handoffChain' | 'executionMode'>): FlowGraph | undefined {
  const handoffChain = ctx.handoffChain ?? [];
  const agentKeys = uniqueAgentKeys(ctx.agents, handoffChain);
  if (agentKeys.length === 0) return undefined;

  const nodes: FlowGraphNode[] = [
    {
      id: 'start',
      type: 'start',
      label: 'AETHER',
      position: { x: 0, y: 0 },
    },
  ];
  const edges: FlowGraphEdge[] = [];

  const isParallel = ctx.executionMode === 'parallel';

  agentKeys.forEach((key, index) => {
    const y = isParallel ? index * NODE_Y_GAP : 0;
    const x = (index + 1) * NODE_X_GAP;
    nodes.push({
      id: key,
      type: 'agent',
      label: agentExplainLabel(key),
      agentKey: key,
      position: { x, y },
    });
  });

  if (handoffChain.length > 0) {
    let prevId = 'start';
    for (const [i, h] of handoffChain.entries()) {
      if (!nodes.find((n) => n.id === h.to)) {
        nodes.push({
          id: h.to,
          type: 'agent',
          label: agentExplainLabel(h.to),
          agentKey: h.to,
          position: { x: (i + 2) * NODE_X_GAP, y: 0 },
        });
      }
      edges.push({
        id: `edge-${i}-${h.from}-${h.to}`,
        source: prevId === 'start' ? h.from : h.from,
        target: h.to,
        label: h.reason?.slice(0, 60),
        animated: h.mode === 'async' && h.status === 'pending',
        style: h.mode === 'async' ? { strokeDasharray: '5 5' } : undefined,
      });
      const targetNode = nodes.find((n) => n.id === h.to);
      if (targetNode && h.status) {
        targetNode.data = { ...targetNode.data, status: h.status, mode: h.mode };
      }
      prevId = h.to;
    }
    if (!edges.some((e) => e.source === 'start')) {
      edges.unshift({
        id: 'edge-start-first',
        source: 'start',
        target: handoffChain[0]!.from,
      });
    }
  } else if (isParallel) {
    for (const key of agentKeys) {
      edges.push({ id: `edge-start-${key}`, source: 'start', target: key });
    }
  } else {
    let prev = 'start';
    for (const key of agentKeys) {
      edges.push({ id: `edge-${prev}-${key}`, source: prev, target: key });
      prev = key;
    }
  }

  const lastTargets = edges.length > 0 ? [...new Set(edges.map((e) => e.target))] : agentKeys;
  const terminal = lastTargets[lastTargets.length - 1] ?? agentKeys[agentKeys.length - 1];
  nodes.push({
    id: 'end',
    type: 'end',
    label: 'Resultaat',
    position: { x: (agentKeys.length + 1) * NODE_X_GAP, y: 0 },
  });
  if (terminal) {
    edges.push({ id: 'edge-end', source: terminal, target: 'end' });
  }

  return { nodes, edges };
}
