import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { CartRepository } from '../../domain/repositories/CartRepository';
import { Cart } from '../../domain/entities/Cart';
import { resolvePublicStorefrontProject } from '../services/resolvePublicStorefront';
import { CartNotFoundError, CartNotOpenError } from './cartErrors';

export class RemoveCartItemUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly cartRepository: CartRepository
  ) {}

  async execute(tenantSlug: string, cartId: string, itemId: string): Promise<Cart> {
    const project = await resolvePublicStorefrontProject(this.siteRepository, tenantSlug);
    const tid = project.tenantId;
    const cart = await this.cartRepository.findById(tid, cartId);
    if (!cart) throw new CartNotFoundError();
    if (cart.status !== 'open') throw new CartNotOpenError();

    const updated = await this.cartRepository.removeItem(tid, cartId, itemId);
    if (!updated) throw new CartNotFoundError('Cart item not found');
    return updated;
  }
}
