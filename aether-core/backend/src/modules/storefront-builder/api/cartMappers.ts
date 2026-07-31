import { Cart } from '../domain/entities/Cart';

export function toCartDto(cart: Cart) {
  return {
    id: cart.id,
    status: cart.status,
    currency: cart.currency,
    customerId: cart.customerId,
    items: cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };
}
