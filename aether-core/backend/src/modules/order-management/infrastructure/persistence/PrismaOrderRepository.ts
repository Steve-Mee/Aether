import { PrismaClient } from '@prisma/client';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { Order, OrderItem } from '../../domain/entities/Order';
import {
  OrderDetail,
  OrderRefundSummary,
  OrderShipmentSummary,
} from '../../domain/entities/OrderDetail';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaOrderRepository implements OrderRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> & { tenantId: string }
  ): Promise<Order> {
    const tid = requireTenantId(orderData.tenantId, 'PrismaOrderRepository.create');
    const order = await this.prisma.order.create({
      data: {
        tenantId: tid,
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
    const tid = requireTenantId(tenantId, 'PrismaOrderRepository.findById');
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId: tid },
      include: { items: true },
    });
    return order ? this.mapToEntity(order) : null;
  }

  async findDetailById(id: string, tenantId: string): Promise<OrderDetail | null> {
    const tid = requireTenantId(tenantId, 'PrismaOrderRepository.findDetailById');
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId: tid },
      include: {
        items: true,
        customer: true,
        shipments: { orderBy: { createdAt: 'desc' } },
        refunds: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) return null;

    const payments = await this.prisma.payment.findMany({
      where: { orderId: id, tenantId: tid },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const payment = payments[0];

    const customerName = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      ...this.mapToEntity(order),
      customer: order.customer
        ? {
            id: order.customer.id,
            email: order.customer.email,
            name: customerName || order.customer.email,
          }
        : null,
      shipments: order.shipments.map((s) => this.mapShipment(s)),
      refunds: order.refunds.map((r) => this.mapRefund(r)),
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod ?? '',
          }
        : null,
    };
  }

  async findAll(tenantId: string): Promise<Order[]> {
    const tid = requireTenantId(tenantId, 'PrismaOrderRepository.findAll');
    const orders = await this.prisma.order.findMany({
      where: { tenantId: tid },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.mapToEntity(o));
  }

  async findByCustomerId(customerId: string, tenantId: string): Promise<Order[]> {
    const tid = requireTenantId(tenantId, 'PrismaOrderRepository.findByCustomerId');
    const orders = await this.prisma.order.findMany({
      where: { tenantId: tid, customerId },
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
    const tid = requireTenantId(tenantId, 'PrismaOrderRepository.updateStatus');
    const existing = await this.prisma.order.findFirst({ where: { id, tenantId: tid } });
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

  async createShipment(
    orderId: string,
    tenantId: string,
    data: { carrier: string; trackingNumber: string }
  ): Promise<OrderShipmentSummary | null> {
    const tid = requireTenantId(tenantId, 'PrismaOrderRepository.createShipment');
    const existing = await this.prisma.order.findFirst({ where: { id: orderId, tenantId: tid } });
    if (!existing) return null;

    const shippedAt = new Date();
    const [shipment] = await this.prisma.$transaction([
      this.prisma.shipment.create({
        data: {
          tenantId: tid,
          orderId,
          status: 'shipped',
          carrier: data.carrier,
          trackingNumber: data.trackingNumber,
          shippedAt,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'shipped' },
      }),
    ]);

    return this.mapShipment(shipment);
  }

  async createRefund(
    orderId: string,
    tenantId: string,
    data: { amount: number; reason?: string; currency?: string }
  ): Promise<OrderRefundSummary | null> {
    const tid = requireTenantId(tenantId, 'PrismaOrderRepository.createRefund');
    const existing = await this.prisma.order.findFirst({ where: { id: orderId, tenantId: tid } });
    if (!existing) return null;

    const refund = await this.prisma.refund.create({
      data: {
        tenantId: tid,
        orderId,
        amount: data.amount,
        currency: data.currency ?? existing.currency,
        status: 'pending',
        reason: data.reason ?? null,
      },
    });
    return this.mapRefund(refund);
  }

  async updateRefundStatus(
    refundId: string,
    tenantId: string,
    status: string
  ): Promise<OrderRefundSummary | null> {
    const tid = requireTenantId(tenantId, 'PrismaOrderRepository.updateRefundStatus');
    const existing = await this.prisma.refund.findFirst({
      where: { id: refundId, tenantId: tid },
    });
    if (!existing) return null;
    const updated = await this.prisma.refund.update({
      where: { id: refundId },
      data: { status },
    });
    return this.mapRefund(updated);
  }

  private mapToEntity(prismaOrder: {
    id: string;
    customerId: string;
    status: string;
    total: number;
    currency: string;
    createdAt: Date;
    items?: OrderItem[];
  }): Order {
    return {
      id: prismaOrder.id,
      customerId: prismaOrder.customerId,
      status: prismaOrder.status as Order['status'],
      total: prismaOrder.total,
      currency: prismaOrder.currency,
      createdAt: prismaOrder.createdAt,
      updatedAt: prismaOrder.createdAt,
      items: prismaOrder.items || [],
    };
  }

  private mapShipment(row: {
    id: string;
    status: string;
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: Date | null;
    createdAt: Date;
  }): OrderShipmentSummary {
    return {
      id: row.id,
      status: row.status,
      carrier: row.carrier,
      trackingNumber: row.trackingNumber,
      shippedAt: row.shippedAt,
      createdAt: row.createdAt,
    };
  }

  private mapRefund(row: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    reason: string | null;
    createdAt: Date;
  }): OrderRefundSummary {
    return {
      id: row.id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      reason: row.reason,
      createdAt: row.createdAt,
    };
  }
}
