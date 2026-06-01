export interface CommandLogEntry {
  tenantId: string;
  command: string;
  intent: string;
  result: string;
  confidence: number;
  actor?: string;
}

export interface CommandLogRecord {
  id: string;
  command: string;
  result: string | null;
  intent: string | null;
  confidence: number | null;
  createdAt: Date;
}

export interface CommandLogPort {
  save(entry: CommandLogEntry): Promise<void>;
  findRecent(tenantId: string): Promise<CommandLogRecord[]>;
}
