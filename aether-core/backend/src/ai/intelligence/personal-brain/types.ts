import type { ConversationSession, MemoryEntry } from './memory/types';

export interface BrainContext {
  loraAdapterId: string;
  loraVersion: string;
  traits: string[];
  lastIntent?: string;
  lastCommandAt?: string;
  appliedGlobalKnowledgeVersion?: string;
  lastGlobalKnowledgeSyncAt?: string;
  appliedGlobalPatchIds?: string[];
  /** Recent session interactions (short-term memory ring buffer). */
  shortTermMemory?: MemoryEntry[];
  /** Cross-session conversation turns for resume context. */
  conversationSession?: ConversationSession;
  lastConsolidatedAt?: string;
}

export interface RememberInput {
  command: string;
  intent: string;
  result: string;
  metadata?: Record<string, unknown>;
}

export interface IndexKnowledgeInput {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RecallResult {
  snippets: string[];
  matches: Array<{ id: string; score: number; content?: string; metadata?: Record<string, unknown> }>;
}
