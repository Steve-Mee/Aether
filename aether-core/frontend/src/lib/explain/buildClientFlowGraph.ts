import type { HandoffChainEntry } from '@/types/command';
import type { FlowGraph } from '@/types/explainability';
import { agentDisplayLabel } from '@/lib/agentDisplay';

const GAP = 160;

export function buildClientFlowGraph(
  handoffChain: HandoffChainEntry[],
  agentKeys: string[],
): FlowGraph | undefined {
  const keys = new Set<string>(agentKeys);
  for (const h of handoffChain) {
    keys.add(h.from);
    keys.add(h.to);
  }
  const list = [...keys];
  if (list.length === 0) return undefined;

  const nodes: FlowGraph['nodes'] = [
    { id: 'start', type: 'start', label: 'AETHER', position: { x: 0, y: 0 } },
  ];
  list.forEach((key, i) => {
    nodes.push({
      id: key,
      type: 'agent',
      label: agentDisplayLabel(key),
      agentKey: key,
      position: { x: (i + 1) * GAP, y: 0 },
    });
  });
  nodes.push({
    id: 'end',
    type: 'end',
    label: 'Resultaat',
    position: { x: (list.length + 1) * GAP, y: 0 },
  });

  const edges: FlowGraph['edges'] = [];
  if (handoffChain.length > 0) {
    edges.push({ id: 'e-start', source: 'start', target: handoffChain[0]!.from });
    handoffChain.forEach((h, i) => {
      edges.push({
        id: `e-${i}`,
        source: h.from,
        target: h.to,
        label: h.reason?.slice(0, 40),
        animated: h.mode === 'async' && h.status === 'pending',
        style: h.mode === 'async' ? { strokeDasharray: '5 5' } : undefined,
      });
    });
    const last = handoffChain[handoffChain.length - 1]!.to;
    edges.push({ id: 'e-end', source: last, target: 'end' });
  } else {
    let prev = 'start';
    for (const key of list) {
      edges.push({ id: `e-${prev}-${key}`, source: prev, target: key });
      prev = key;
    }
    edges.push({ id: 'e-end', source: prev, target: 'end' });
  }

  return { nodes, edges };
}
