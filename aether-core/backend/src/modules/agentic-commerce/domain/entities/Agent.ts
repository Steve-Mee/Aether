export interface Agent {
  id: string;
  type: 'CUSTOMER' | 'MERCHANT';
  name: string;
  preferences: {
    maxPrice?: number;
    minMargin?: number;
    preferredDeliveryDays?: number;
  };
  createdAt: Date;
}