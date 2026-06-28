export type GraphNodeKind =
  | 'router'
  | 'agent'
  | 'peer'
  | 'merge'
  | 'parallel_fork'
  | 'parallel_join'
  | 'subgraph'
  | 'supervisor';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  agentKey?: string;
  intent?: string;
  command?: string;
  /** peer edge: sync or async */
  peerMode?: 'sync' | 'async';
  targetAgentKey?: string;
  /** nested graph for subgraph nodes */
  subgraph?: GraphDefinition;
}

export interface GraphEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface GraphDefinition {
  nodes: GraphNode[];
  edges: GraphEdge[];
  entryNodeId: string;
}

export interface GraphState {
  command: string;
  tenantId: string;
  activeAgentKey?: string;
  peerJobs: Array<{ jobId: string; status: string }>;
  handoffChain: import('../types').HandoffChainEntry[];
  narratives: string[];
  mode: import('../types').ExecutionMode;
}

export function isGraphPeerEdgesEnabled(): boolean {
  if (process.env.MULTI_AGENT_GRAPH_PEER_EDGES === 'false') return false;
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.MULTI_AGENT_GRAPH_PEER_EDGES !== 'true'
  ) {
    return false;
  }
  return process.env.MULTI_AGENT_GRAPH_PEER_EDGES === 'true';
}
