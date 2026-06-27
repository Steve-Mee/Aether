/** Gates HiveMind collective/knowledge context per tenant settings + env. */
export interface KnowledgeTransferGatePort {
  isEnabled(tenantId: string): Promise<boolean>;
}
