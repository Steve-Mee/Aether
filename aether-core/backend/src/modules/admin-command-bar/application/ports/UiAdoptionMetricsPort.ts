export interface UiAdoptionMetrics {
  commands7d: number;
  manualNavEvents7d: number;
  nlActionShare7d: number;
  timeSavedMinutes7d: number;
  autonomousActions7d: number;
  /** Policy-auto approvals + autonomy_execute in the last 24 hours */
  lowRiskAutonomous24h: number;
}

export interface UiAdoptionMetricsPort {
  getCommandIntentsSince(tenantId: string, since: Date): Promise<Array<{ intent: string | null }>>;
  countNavEventsSince(tenantId: string, since: Date): Promise<number>;
  countAutonomyAuditsSince(tenantId: string, since: Date): Promise<number>;
  countPolicyAutoApprovalsSince(tenantId: string, since: Date): Promise<number>;
  countAutonomyExecuteSince(tenantId: string, since: Date): Promise<number>;
}
