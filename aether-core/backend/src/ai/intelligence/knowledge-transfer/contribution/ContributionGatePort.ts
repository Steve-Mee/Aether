/** Gates outbound knowledge contribution (Personal → Global). */
export interface ContributionGatePort {
  canContribute(tenantId: string): Promise<boolean>;
  shouldFederate(tenantId: string): Promise<boolean>;
}
