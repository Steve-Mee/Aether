import { Order, OrderItem } from '../entities/Order';

export interface OrderRepository {
  create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findAll(): Promise<Order[]>;
  updateStatus(id: string, status: Order['status']): Promise<Order | null>;
  addItem(orderId: string, item: Omit<OrderItem, 'id'>): Promise<OrderItem>;
}