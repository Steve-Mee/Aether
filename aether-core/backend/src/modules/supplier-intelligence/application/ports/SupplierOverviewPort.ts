import type {
  SupplierDetailResponse,
  SupplierOverviewResponse,
  SupplierSyncHistoryItem,
} from '../services/supplierOverviewTypes';

export interface SupplierOverviewPort {
  getOverview(tenantId: string): Promise<SupplierOverviewResponse>;
  getSyncHistory(
    tenantId: string,
    supplierId: string,
    limit?: number
  ): Promise<SupplierSyncHistoryItem[]>;
  getDetail(tenantId: string, supplierId: string): Promise<SupplierDetailResponse | null>;
}
