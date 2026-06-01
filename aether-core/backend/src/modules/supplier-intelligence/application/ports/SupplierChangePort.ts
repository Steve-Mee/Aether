export interface SupplierChangePort {
  recordChange(data: {
    tenantId: string;
    supplierId: string;
    changeType: string;
    payload: string;
    status: string;
  }): Promise<void>;

  applyPendingChanges(
    tenantId: string,
    supplierId: string,
    changeHint?: Record<string, unknown>
  ): Promise<number>;
}
