export interface SupplierMonitorPort {
  monitorSupplier(
    supplierId: string,
    ctx: { tenantId: string; actorId?: string }
  ): Promise<{ changeCount: number }>;
}
