export interface BilateralExportDataPort {
  countProducts(tenantId: string): Promise<number>;
  countLowStockProducts(tenantId: string, threshold: number): Promise<number>;
  findSupplierTypes(tenantId: string, limit: number): Promise<Array<{ supplierType: string | null }>>;
}
