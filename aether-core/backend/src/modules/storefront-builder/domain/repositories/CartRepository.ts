import { Cart, CartItem, CartStatus } from '../entities/Cart';

export interface CreateCartInput {
  tenantId: string;
  customerId?: string | null;
  currency?: string;
}

export interface AddCartItemInput {
  tenantId: string;
  cartId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface UpdateCartItemInput {
  tenantId: string;
  cartId: string;
  itemId: string;
  quantity: number;
}

export interface CartRepository {
  create(input: CreateCartInput): Promise<Cart>;
  findById(tenantId: string, cartId: string): Promise<Cart | null>;
  addOrBumpItem(input: AddCartItemInput): Promise<Cart>;
  updateItemQuantity(input: UpdateCartItemInput): Promise<Cart | null>;
  removeItem(tenantId: string, cartId: string, itemId: string): Promise<Cart | null>;
  updateStatus(tenantId: string, cartId: string, status: CartStatus): Promise<void>;
  setCustomerId(tenantId: string, cartId: string, customerId: string): Promise<void>;
}
