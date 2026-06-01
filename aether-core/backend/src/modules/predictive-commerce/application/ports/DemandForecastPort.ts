export interface OrderHistoryRow {
  quantity: number;
}

export interface DemandForecastPort {
  getOrderHistory(productId: string, tenantId: string, since: Date): Promise<OrderHistoryRow[]>;
}
