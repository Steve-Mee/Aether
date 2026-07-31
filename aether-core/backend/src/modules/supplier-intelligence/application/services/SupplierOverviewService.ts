import type { SupplierOverviewPort } from '../ports/SupplierOverviewPort';
import type {
  SupplierDetailResponse,
  SupplierOverviewResponse,
  SupplierSyncHistoryItem,
} from './supplierOverviewTypes';

export type {
  SupplierChangeDetail,
  SupplierDetailResponse,
  SupplierMonitoringLabel,
  SupplierOverviewResponse,
  SupplierOverviewRow,
  SupplierOverviewStats,
  SupplierProductDetail,
  SupplierSyncHistoryItem,
  SupplierSyncSource,
} from './supplierOverviewTypes';

/** Thin façade over SupplierOverviewPort — keeps controller import path stable. */
export class SupplierOverviewService implements SupplierOverviewPort {
  constructor(private readonly overview: SupplierOverviewPort) {}

  getOverview(tenantId: string): Promise<SupplierOverviewResponse> {
    return this.overview.getOverview(tenantId);
  }

  getSyncHistory(
    tenantId: string,
    supplierId: string,
    limit?: number
  ): Promise<SupplierSyncHistoryItem[]> {
    return this.overview.getSyncHistory(tenantId, supplierId, limit);
  }

  getDetail(tenantId: string, supplierId: string): Promise<SupplierDetailResponse | null> {
    return this.overview.getDetail(tenantId, supplierId);
  }
}
