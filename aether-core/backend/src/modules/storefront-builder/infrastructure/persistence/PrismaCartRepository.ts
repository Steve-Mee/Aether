import { PrismaClient } from '@prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { Cart, CartItem, CartStatus } from '../../domain/entities/Cart';
import {
  AddCartItemInput,
  CartRepository,
  CreateCartInput,
  UpdateCartItemInput,
} from '../../domain/repositories/CartRepository';

type CartRow = {
  id: string;
  tenantId: string;
  customerId: string | null;
  status: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    cartId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    unitPrice: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateCartInput): Promise<Cart> {
    const tid = requireTenantId(input.tenantId, 'PrismaCartRepository.create');
    const row = await this.prisma.cart.create({
      data: {
        tenantId: tid,
        customerId: input.customerId ?? null,
        currency: input.currency ?? 'EUR',
        status: 'open',
      },
      include: { items: true },
    });
    return this.toCart(row as CartRow);
  }

  async findById(tenantId: string, cartId: string): Promise<Cart | null> {
    const tid = requireTenantId(tenantId, 'PrismaCartRepository.findById');
    const row = await this.prisma.cart.findFirst({
      where: { id: cartId, tenantId: tid },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    return row ? this.toCart(row as CartRow) : null;
  }

  async addOrBumpItem(input: AddCartItemInput): Promise<Cart> {
    const tid = requireTenantId(input.tenantId, 'PrismaCartRepository.addOrBumpItem');
    const cart = await this.prisma.cart.findFirst({
      where: { id: input.cartId, tenantId: tid, status: 'open' },
      include: { items: true },
    });
    if (!cart) {
      throw new Error('CART_NOT_FOUND');
    }

    const variantId = input.variantId ?? null;
    const existing = cart.items.find(
      (i) =>
        i.productId === input.productId &&
        (i.variantId ?? null) === variantId
    );

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + input.quantity,
          unitPrice: input.unitPrice,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          variantId,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
        },
      });
    }

    const updated = await this.findById(tid, input.cartId);
    if (!updated) throw new Error('CART_NOT_FOUND');
    return updated;
  }

  async updateItemQuantity(input: UpdateCartItemInput): Promise<Cart | null> {
    const tid = requireTenantId(input.tenantId, 'PrismaCartRepository.updateItemQuantity');
    const cart = await this.prisma.cart.findFirst({
      where: { id: input.cartId, tenantId: tid, status: 'open' },
      include: { items: true },
    });
    if (!cart) return null;
    const item = cart.items.find((i) => i.id === input.itemId);
    if (!item) return null;

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: input.quantity },
    });
    return this.findById(tid, input.cartId);
  }

  async removeItem(
    tenantId: string,
    cartId: string,
    itemId: string
  ): Promise<Cart | null> {
    const tid = requireTenantId(tenantId, 'PrismaCartRepository.removeItem');
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, tenantId: tid, status: 'open' },
      include: { items: true },
    });
    if (!cart) return null;
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) return null;

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.findById(tid, cartId);
  }

  async updateStatus(
    tenantId: string,
    cartId: string,
    status: CartStatus
  ): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaCartRepository.updateStatus');
    await this.prisma.cart.updateMany({
      where: { id: cartId, tenantId: tid },
      data: { status },
    });
  }

  async setCustomerId(
    tenantId: string,
    cartId: string,
    customerId: string
  ): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaCartRepository.setCustomerId');
    await this.prisma.cart.updateMany({
      where: { id: cartId, tenantId: tid },
      data: { customerId },
    });
  }

  private toCart(row: CartRow): Cart {
    return new Cart(
      row.id,
      row.tenantId,
      row.status as CartStatus,
      row.currency,
      row.customerId,
      row.items.map(
        (i) =>
          new CartItem(
            i.id,
            i.cartId,
            i.productId,
            i.quantity,
            i.variantId,
            i.unitPrice,
            i.createdAt,
            i.updatedAt
          )
      ),
      row.createdAt,
      row.updatedAt
    );
  }
}
