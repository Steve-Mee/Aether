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

export class UpdateCartItemUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly cartRepository: CartRepository,
    private readonly catalog: StorefrontCatalogPort
  ) {}

  async execute(
    tenantSlug: string,
    cartId: string,
    itemId: string,
    quantity: number
  ): Promise<Cart> {
    const project = await resolvePublicStorefrontProject(this.siteRepository, tenantSlug);
    const tid = project.tenantId;
    const qty = Math.floor(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      throw new StockInsufficientError('Quantity must be at least 1');
    }

    const cart = await this.cartRepository.findById(tid, cartId);
    if (!cart) throw new CartNotFoundError();
    if (cart.status !== 'open') throw new CartNotOpenError();

    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new CartNotFoundError('Cart item not found');

    const product = await this.catalog.getProductById(tid, item.productId);
    if (!product) throw new CartProductNotFoundError();

    let available = product.stock;
    if (item.variantId) {
      const variant = product.variants?.find((v) => v.id === item.variantId);
      if (!variant) throw new CartProductNotFoundError('Variant not found');
      available = variant.stock;
    }
    if (qty > available) throw new StockInsufficientError();

    const updated = await this.cartRepository.updateItemQuantity({
      tenantId: tid,
      cartId,
      itemId,
      quantity: qty,
    });
    if (!updated) throw new CartNotFoundError();
    return updated;
  }
}
