export interface AuditLogRecord {
  id: string;
  tenantId: string;
  module: string;
  action: string;
  actor: string | null;
  details: string | null;
  createdAt: Date;
}

export interface CommandRecord {
  id: string;
  tenantId: string;
  command: string;
  intent: string | null;
  result: string | null;
  confidence: number | null;
  actor: string | null;
  createdAt: Date;
}

export interface AuditLogFilter {
  tenantId: string;
  since: Date;
  module?: string;
  excludeNavigation?: boolean;
  take: number;
}

export interface ActivityFeedPort {
  findAuditLogs(filter: AuditLogFilter): Promise<AuditLogRecord[]>;
  findCommands(tenantId: string, since: Date, take: number): Promise<CommandRecord[]>;
}
