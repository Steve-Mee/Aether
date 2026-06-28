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

export interface CommandLogPort {
  save(entry: CommandLogEntry, options?: CommandLogSaveOptions): Promise<CommandLogRecord>;
  findRecent(tenantId: string): Promise<CommandLogRecord[]>;
  findById(id: string, tenantId: string): Promise<CommandLogRecord | null>;
}
