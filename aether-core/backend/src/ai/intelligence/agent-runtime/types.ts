export interface CompoundStep {
  index: number;
  command: string;
  intent: string;
  parameters?: Record<string, unknown>;
  confidence: number;
}

export interface ParsedCommand {
  intent: string;
  action?: string | null;
  parameters?: Record<string, unknown>;
  confidence: number;
  source?: 'llm' | 'regex' | 'none';
  compound?: {
    steps: CompoundStep[];
    connector: 'sequential' | 'parallel';
  };
}

export interface ProcessCommandInput {
  tenantId: string;
  command: string;
  actorId?: string;
  /** Pre-retrieved context snippets from CommandBrainService (hybrid RAG). */
  contextSnippets?: string[];
  /** Pre-retrieved episodic memory snippets for parse context. */
  memorySnippets?: string[];
}

export interface ProcessCommandOutput {
  parsed: ParsedCommand;
  contextSnippets: string[];
  actionProposal?: string;
}
