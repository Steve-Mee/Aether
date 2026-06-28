export interface FlowGraphNode {
  id: string;
  type: 'start' | 'agent' | 'end';
  label: string;
  agentKey?: string;
  position: { x: number; y: number };
  data?: { status?: string; mode?: string };
}

export interface FlowGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: { strokeDasharray?: string };
}

export interface FlowGraph {
  nodes: FlowGraphNode[];
  edges: FlowGraphEdge[];
}

export interface SimilarActionRef {
  sourceType: string;
  sourceId?: string;
  summary: string;
  at?: string;
  similarityScore: number;
  diffHints: string[];
  scope?: 'tenant' | 'global';
  peerTenantCount?: number;
  patternKey?: string;
}

export interface ExplainabilityDiff {
  left: { sourceType: string; sourceId: string; summary: string };
  right: { sourceType: string; sourceId: string; summary: string };
  summaryChanged: boolean;
  agents: { added: string[]; removed: string[]; unchanged: string[] };
  triggerIdChanged: boolean;
  intentIdChanged: boolean;
  dataSourcesAdded: string[];
  dataSourcesRemoved: string[];
  reasoningAdded: string[];
  reasoningRemoved: string[];
  flowGraph?: {
    addedNodes: FlowGraphNode[];
    removedNodes: FlowGraphNode[];
    changedEdges: FlowGraphEdge[];
  };
  narrativeHints: string[];
}

export interface ExplainabilitySectionItem {
  label: string;
  detail?: string;
  meta?: string;
  link?: { entityType: string; entityId: string };
}

export interface ExplainabilitySection {
  id:
    | 'summary'
    | 'agents'
    | 'dataSources'
    | 'reasoning'
    | 'reflections'
    | 'handoffChain'
    | 'policy'
    | 'flow'
    | 'similar';
  title: string;
  items: ExplainabilitySectionItem[];
  flowGraph?: FlowGraph;
}

export interface ExplainTimelineEvent {
  at: string;
  label: string;
  status?: string;
  module?: string;
  actor?: string;
  category?: string;
  actionType?: string;
  details?: unknown;
}

export interface ExplainTimeline {
  entityType: string;
  entityId: string;
  detailLevel?: 'simple' | 'extended';
  summary?: string;
  summarySource?: 'template' | 'llm';
  llmSummaryPending?: boolean;
  sections?: ExplainabilitySection[];
  flowGraph?: FlowGraph;
  similarActions?: SimilarActionRef[];
  events?: ExplainTimelineEvent[];
}

export type ExplainEntityType = 'email' | 'approval' | 'command' | 'proactive_suggestion';

export interface LiveExplainState {
  summary?: string;
  sections?: ExplainabilitySection[];
  flowGraph?: FlowGraph;
}
