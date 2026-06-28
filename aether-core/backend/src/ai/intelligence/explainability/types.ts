import type { HandoffChainEntry } from '../multi-agent/types';

export type ExplainabilitySourceType =
  | 'command'
  | 'proactive_suggestion'
  | 'proactive_auto';

export type ExplainabilityDetailLevel = 'off' | 'simple' | 'extended';

export type ExplainabilityPersistLevel = 'minimal' | 'simple' | 'extended';

export type ExplainabilitySummarySource = 'template' | 'llm';

export type ExplainabilityDataSourceKind =
  | 'rag'
  | 'personal_brain'
  | 'global_brain'
  | 'shared_memory'
  | 'trigger_evidence'
  | 'merchant_memory';

export interface ExplainabilityAgentEntry {
  agentKey: string;
  role: 'primary' | 'specialist' | 'peer';
  label: string;
  reasoning?: string;
  contribution?: string;
}

export interface ExplainabilityDataSource {
  kind: ExplainabilityDataSourceKind;
  label: string;
  preview?: string;
  score?: number;
}

export interface ExplainabilityReasoningStep {
  label: string;
  detail?: string;
  at?: string;
}

export interface ExplainabilityReflection {
  observation: string;
  nextAction?: string;
}

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
  sourceType: ExplainabilitySourceType;
  sourceId?: string;
  summary: string;
  at?: string;
  similarityScore: number;
  diffHints: string[];
  scope?: 'tenant' | 'global';
  peerTenantCount?: number;
  patternKey?: string;
}

export interface ExplainabilityDiffAgents {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export interface ExplainabilityDiffFlowGraph {
  addedNodes: FlowGraphNode[];
  removedNodes: FlowGraphNode[];
  changedEdges: FlowGraphEdge[];
}

export interface ExplainabilityDiff {
  left: { sourceType: string; sourceId: string; summary: string };
  right: { sourceType: string; sourceId: string; summary: string };
  summaryChanged: boolean;
  agents: ExplainabilityDiffAgents;
  triggerIdChanged: boolean;
  intentIdChanged: boolean;
  dataSourcesAdded: string[];
  dataSourcesRemoved: string[];
  reasoningAdded: string[];
  reasoningRemoved: string[];
  flowGraph?: ExplainabilityDiffFlowGraph;
  narrativeHints: string[];
}

export interface ExplainabilityPayload {
  summary: string;
  agents: ExplainabilityAgentEntry[];
  dataSources: ExplainabilityDataSource[];
  reasoningSteps: ExplainabilityReasoningStep[];
  reflections: ExplainabilityReflection[];
  handoffChain?: HandoffChainEntry[];
  globalKnowledge?: { message?: string; snippetCount?: number };
  policyNotes?: string[];
  flowGraph?: FlowGraph;
  linkedCommandId?: string;
  linkedSuggestionId?: string;
  goalId?: string;
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
  items: Array<{ label: string; detail?: string; meta?: string; link?: { entityType: string; entityId: string } }>;
  flowGraph?: FlowGraph;
}

export interface ExplainabilityResponse {
  entityType: string;
  entityId: string;
  detailLevel: 'simple' | 'extended';
  summary: string;
  summarySource?: ExplainabilitySummarySource;
  llmSummaryPending?: boolean;
  sections: ExplainabilitySection[];
  flowGraph?: FlowGraph;
  similarActions?: SimilarActionRef[];
  events?: Array<Record<string, unknown>>;
}

export interface ExplainabilityContributor {
  contribute(ctx: ExplainabilityBuildContext): ExplainabilityContributorResult | void;
}

export interface ExplainabilityBuildContext {
  agents: ExplainabilityAgentEntry[];
  dataSources: ExplainabilityDataSource[];
  reasoningSteps: ExplainabilityReasoningStep[];
  reflections: ExplainabilityReflection[];
  handoffChain: HandoffChainEntry[];
  globalKnowledge?: { message?: string; snippetCount?: number };
  policyNotes: string[];
  planReasoning?: string;
  executionMode?: 'single' | 'sequential' | 'parallel';
  agentContributions?: Array<{ agentKey: string; summary: string }>;
  intentId?: string;
  triggerId?: string;
}

export interface ExplainabilityContributorResult {
  dataSources?: ExplainabilityDataSource[];
  reasoningSteps?: ExplainabilityReasoningStep[];
  policyNotes?: string[];
}

export interface ExplainabilityLiveUpdate {
  summary?: string;
  sections?: ExplainabilitySection[];
  flowGraph?: FlowGraph;
}
