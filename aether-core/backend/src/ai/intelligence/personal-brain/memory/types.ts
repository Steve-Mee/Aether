export type MemoryLayer = 'short' | 'long';
export type MemoryPriority = 'high' | 'medium' | 'low';
export type MemoryKind = 'episodic' | 'semantic' | 'interaction' | 'plan' | 'adaptive' | 'reflection';

export interface MemoryEntry {
  id: string;
  command: string;
  intent: string;
  outcome: string;
  timestamp: string;
  commandId?: string;
  success: boolean;
  brainMemoryId?: string;
  kind?: MemoryKind;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  commandId?: string;
}

export interface ConversationSession {
  sessionId: string;
  turns: ConversationTurn[];
  lastActiveAt: string;
}

export interface MemoryOutcomeMetrics {
  uplift?: number;
  toolsUsed?: number;
}

export interface MemoryRecordInput {
  tenantId: string;
  command: string;
  intent: string;
  outcome: string;
  success: boolean;
  confidence: number;
  agentKey?: string;
  commandId?: string;
  goalReached?: boolean;
  verifiedUplift?: number;
  toolsUsed?: number;
}

export interface ReflectionMemoryInput {
  tenantId: string;
  command: string;
  intent: string;
  agentKey?: string;
  summary: import('../../command-brain/types/AgentPlan').AgentRunSummary;
  plan?: import('../../command-brain/types/AgentPlan').AgentPlan | null;
  toolTrace?: Array<{ tool: string; output?: string }>;
  reflections?: string[];
  trigger?: import('../reflection/types').ReflectionTrigger;
  usedAgentLoop?: boolean;
  checkpoint?: boolean;
}

export interface ExperienceReflectionRecordInput extends ReflectionMemoryInput {
  trigger: import('../reflection/types').ReflectionTrigger;
}

export interface ScoredMemoryEntry {
  entry: MemoryEntry;
  layer: MemoryLayer;
  kind: MemoryKind;
  score: number;
  ageLabel: string;
}

export interface MemoryRecallOptions {
  agentKey?: string;
  intent?: string;
  tool?: string;
}

export interface MemoryRecalledItem {
  summary: string;
  age: string;
  layer: MemoryLayer;
  kind: MemoryKind;
}

export interface MemoryRecallResult {
  promptBlock: string;
  conversationBlock?: string;
  userNotice?: string;
  reflectionNotice?: string;
  memoryRecalled: MemoryRecalledItem[];
  entries: ScoredMemoryEntry[];
}

export interface MemoryEntryListItem {
  id: string;
  kind: MemoryKind;
  command: string;
  summary: string;
  priority?: MemoryPriority;
  rememberedAt?: string;
  expiresAt?: string;
}

export interface MemorySummary {
  shortTermCount: number;
  conversationTurnCount: number;
  episodicCount: number;
  semanticCount: number;
  interactionCount: number;
  lastConsolidatedAt?: string;
}
