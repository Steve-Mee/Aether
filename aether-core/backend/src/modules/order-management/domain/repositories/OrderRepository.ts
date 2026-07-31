import { Order, OrderItem } from '../entities/Order';
import { OrderDetail, OrderRefundSummary, OrderShipmentSummary } from '../entities/OrderDetail';

export interface OrderRepository {
  create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> & { tenantId: string }): Promise<Order>;
  findById(id: string, tenantId: string): Promise<Order | null>;
  findDetailById(id: string, tenantId: string): Promise<OrderDetail | null>;
  findAll(tenantId: string): Promise<Order[]>;
  findByCustomerId(customerId: string, tenantId: string): Promise<Order[]>;
  updateStatus(id: string, status: Order['status'], tenantId: string): Promise<Order | null>;
  addItem(orderId: string, item: Omit<OrderItem, 'id'>): Promise<OrderItem>;
  createShipment(
    orderId: string,
    tenantId: string,
    data: { carrier: string; trackingNumber: string }
  ): Promise<OrderShipmentSummary | null>;
  createRefund(
    orderId: string,
    tenantId: string,
    data: { amount: number; reason?: string; currency?: string }
  ): Promise<OrderRefundSummary | null>;
  updateRefundStatus(
    refundId: string,
    tenantId: string,
    status: string
  ): Promise<OrderRefundSummary | null>;
}
