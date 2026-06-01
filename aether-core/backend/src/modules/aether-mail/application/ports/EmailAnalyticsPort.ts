export interface EmailAnalyticsPort {
  listEmailsSince(tenantId: string, since: Date): Promise<
    Array<{ category: string | null; status: string }>
  >;
  listProcessedAuditLogsSince(
    tenantId: string,
    since: Date
  ): Promise<Array<{ details: string | null }>>;
  countRollbackAuditLogsSince(tenantId: string, since: Date): Promise<number>;
}
