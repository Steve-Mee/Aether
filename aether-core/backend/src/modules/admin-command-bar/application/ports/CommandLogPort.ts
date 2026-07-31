export interface CommandLogEntry {
  tenantId: string;
  command: string;
  intent: string;
  result: string;
  confidence: number;
  actor?: string;
  brainMemoryId?: string;
  operationalMeta?: Record<string, unknown>;
}

export interface CommandLogRecord {
  id: string;
  command: string;
  result: string | null;
  intent: string | null;
  confidence: number | null;
  createdAt: Date;
}

export interface CommandLogSaveOptions {
  undoable?: boolean;
  undoExpiresAt?: Date;
}

export interface CommandLogUpdateResult {
  result: string;
  intent: string;
  confidence: number;
}

export interface CommandUndoRecord {
  id: string;
  tenantId: string;
  command: string;
  intent: string | null;
  undoable: boolean;
  revertedAt: Date | null;
  undoExpiresAt: Date | null;
  brainMemoryId?: string | null;
  operationalMeta?: string | null;
}

export interface CommandLogPort {
  save(entry: CommandLogEntry, options?: CommandLogSaveOptions): Promise<CommandLogRecord>;
  findRecent(tenantId: string): Promise<CommandLogRecord[]>;
  findById(id: string, tenantId: string): Promise<CommandLogRecord | null>;
  updateResult(id: string, data: CommandLogUpdateResult): Promise<CommandLogRecord>;
  updateBrainMemoryId(id: string, brainMemoryId: string): Promise<void>;
  findForUndo(id: string, tenantId: string): Promise<CommandUndoRecord | null>;
  markReverted(id: string): Promise<void>;
}
