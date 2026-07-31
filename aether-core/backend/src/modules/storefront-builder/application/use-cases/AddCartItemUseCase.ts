import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { CartRepository } from '../../domain/repositories/CartRepository';
import { Cart } from '../../domain/entities/Cart';
import { StorefrontCatalogPort } from '../ports/StorefrontCatalogPort';
import { resolvePublicStorefrontProject } from '../services/resolvePublicStorefront';
import {
  CartNotFoundError,
  CartNotOpenError,
  CartProductNotFoundError,
  StockInsufficientError,
} from './cartErrors';

export class AddCartItemUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly cartRepository: CartRepository,
    private readonly catalog: StorefrontCatalogPort
  ) {}

  async execute(
    tenantSlug: string,
    cartId: string,
    input: { productId: string; variantId?: string | null; quantity: number }
  ): Promise<Cart> {
    const project = await resolvePublicStorefrontProject(this.siteRepository, tenantSlug);
    const tid = project.tenantId;
    const quantity = Math.floor(input.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new StockInsufficientError('Quantity must be at least 1');
    }

    const cart = await this.cartRepository.findById(tid, cartId);
    if (!cart) throw new CartNotFoundError();
    if (cart.status !== 'open') throw new CartNotOpenError();

    const product = await this.catalog.getProductById(tid, input.productId);
    if (!product) throw new CartProductNotFoundError();

    let unitPrice = product.price;
    let available = product.stock;
    const variantId = input.variantId ?? null;
    if (variantId) {
      const variant = product.variants?.find((v) => v.id === variantId);
      if (!variant) throw new CartProductNotFoundError('Variant not found');
      unitPrice = variant.price;
      available = variant.stock;
    }

    const existingQty =
      cart.items.find(
        (i) =>
          i.productId === input.productId && (i.variantId ?? null) === variantId
      )?.quantity ?? 0;
    if (existingQty + quantity > available) {
      throw new StockInsufficientError();
    }

    try {
      return await this.cartRepository.addOrBumpItem({
        tenantId: tid,
        cartId,
        productId: input.productId,
        variantId,
        quantity,
        unitPrice,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'CART_NOT_FOUND') {
        throw new CartNotFoundError();
      }
      throw err;
    }
  }
}
