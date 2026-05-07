export interface SmartShelf {
  id: string;
  locationId: string;
  productSlots: Array<{
    productId: string;
    currentStock: number;
    maxCapacity: number;
  }>;
  lastSync: Date;
}
