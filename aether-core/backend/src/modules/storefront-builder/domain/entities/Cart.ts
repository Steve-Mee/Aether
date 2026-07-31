export type CartStatus = 'open' | 'checked_out' | 'abandoned';

export class CartItem {
  constructor(
    public id: string,
    public cartId: string,
    public productId: string,
    public quantity: number,
    public variantId: string | null = null,
    public unitPrice: number | null = null,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
}

export class Cart {
  constructor(
    public id: string,
    public tenantId: string,
    public status: CartStatus = 'open',
    public currency: string = 'EUR',
    public customerId: string | null = null,
    public items: CartItem[] = [],
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
}
