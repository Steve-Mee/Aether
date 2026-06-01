import { PrismaClient } from '@prisma/client';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { Order, OrderItem } from '../../domain/entities/Order';

export class PrismaOrderRepository implements OrderRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> & { tenantId: string }
  ): Promise<Order> {
    const order = await this.prisma.order.create({
      data: {
        tenantId: orderData.tenantId,
        customerId: orderData.customerId,
        status: orderData.status,
        total: orderData.total,
        currency: orderData.currency,
        items: {
          create: orderData.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });

    return this.mapToEntity(order);
  }

  async findById(id: string, tenantId: string): Promise<Order | null> {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    return order ? this.mapToEntity(order) : null;
  }

  async findAll(tenantId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.mapToEntity(o));
  }

  async updateStatus(
    id: string,
    status: Order['status'],
    tenantId: string
  ): Promise<Order | null> {
    const existing = await this.prisma.order.findFirst({ where: { id, tenantId } });
    if (!existing) return null;

    const order = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
    return this.mapToEntity(order);
  }

  async addItem(orderId: string, item: Omit<OrderItem, 'id'>): Promise<OrderItem> {
    return this.prisma.orderItem.create({
      data: {
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      },
    });
  }

  private mapToEntity(prismaOrder: any): Order {
    return {
      id: prismaOrder.id,
      customerId: prismaOrder.customerId,
      status: prismaOrder.status as Order['status'],
      total: prismaOrder.total,
      currency: prismaOrder.currency,
      createdAt: prismaOrder.createdAt,
      updatedAt: prismaOrder.updatedAt ?? prismaOrder.createdAt,
      items: prismaOrder.items || [],
    };
  }
}
