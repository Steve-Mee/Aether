import { Order, OrderItem } from '../entities/Order';

export interface OrderRepository {
  create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> & { tenantId: string }): Promise<Order>;
  findById(id: string, tenantId: string): Promise<Order | null>;
  findAll(tenantId: string): Promise<Order[]>;
  updateStatus(id: string, status: Order['status'], tenantId: string): Promise<Order | null>;
  addItem(orderId: string, item: Omit<OrderItem, 'id'>): Promise<OrderItem>;
}
