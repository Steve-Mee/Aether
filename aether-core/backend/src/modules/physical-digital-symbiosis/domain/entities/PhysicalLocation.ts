export interface PhysicalLocation {
  id: string;
  name: string;
  address: string;
  type: 'store' | 'popup' | 'kiosk' | 'warehouse';
  status: 'active' | 'inactive';
  createdAt: Date;
}
