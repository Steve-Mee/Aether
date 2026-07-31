import { Order, OrderItem } from './Order';

export interface OrderCustomerSummary {
  id: string;
  email: string;
  name: string;
}

export interface OrderShipmentSummary {
  id: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: Date | null;
  createdAt: Date;
}

export interface OrderRefundSummary {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  createdAt: Date;
}

export interface OrderPaymentSummary {
  id: string;
  status: string;
  amount: number;
  paymentMethod: string;
}

export interface OrderDetail extends Order {
  customer: OrderCustomerSummary | null;
  shipments: OrderShipmentSummary[];
  refunds: OrderRefundSummary[];
  payment: OrderPaymentSummary | null;
  items: OrderItem[];
}
