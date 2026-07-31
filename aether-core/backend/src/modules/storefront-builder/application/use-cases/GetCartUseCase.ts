import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { CartRepository } from '../../domain/repositories/CartRepository';
import { Cart } from '../../domain/entities/Cart';
import { resolvePublicStorefrontProject } from '../services/resolvePublicStorefront';
import { CartNotFoundError } from './cartErrors';

export class GetCartUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly cartRepository: CartRepository
  ) {}

  async execute(tenantSlug: string, cartId: string): Promise<Cart> {
    const project = await resolvePublicStorefrontProject(this.siteRepository, tenantSlug);
    const cart = await this.cartRepository.findById(project.tenantId, cartId);
    if (!cart) throw new CartNotFoundError();
    return cart;
  }
}
