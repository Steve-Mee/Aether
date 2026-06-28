import React, { memo, useMemo } from 'react';
import { ReactFlow, Background, MarkerType, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { FlowGraph } from '@/types/explainability';
import { agentDisplayLabel } from '@/lib/agentDisplay';

interface AgentFlowDiagramProps {
  graph: FlowGraph;
  className?: string;
  height?: number;
}

function toReactFlowNodes(graph: FlowGraph): Node[] {
  return graph.nodes.map((n) => ({
    id: n.id,
    position: n.position,
    data: {
      label: n.type === 'agent' && n.agentKey ? agentDisplayLabel(n.agentKey) : n.label,
      status: n.data?.status,
    },
    style: {
      fontSize: 11,
      padding: 6,
      borderRadius: 6,
      border:
        n.type === 'start' || n.type === 'end'
          ? '1px dashed hsl(var(--border))'
          : '1px solid hsl(var(--border))',
      background: 'hsl(var(--card))',
      minWidth: 80,
      textAlign: 'center' as const,
    },
    draggable: false,
    selectable: false,
  }));
}

function toReactFlowEdges(graph: FlowGraph): Edge[] {
  return graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.animated,
    style: e.style,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    labelStyle: { fontSize: 9, fill: 'hsl(var(--muted-foreground))' },
  }));
}

function AgentFlowDiagramInner({ graph, className, height = 160 }: AgentFlowDiagramProps) {
  const nodes = useMemo(() => toReactFlowNodes(graph), [graph]);
  const edges = useMemo(() => toReactFlowEdges(graph), [graph]);

  if (graph.nodes.length === 0) return null;

  return (
    <div className={className} style={{ height }} aria-hidden>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default memo(AgentFlowDiagramInner);
