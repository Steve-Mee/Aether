import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { CartRepository } from '../../domain/repositories/CartRepository';
import { Cart } from '../../domain/entities/Cart';
import { resolvePublicStorefrontProject } from '../services/resolvePublicStorefront';

export class CreateCartUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly cartRepository: CartRepository
  ) {}

  async execute(tenantSlug: string): Promise<Cart> {
    const project = await resolvePublicStorefrontProject(this.siteRepository, tenantSlug);
    return this.cartRepository.create({ tenantId: project.tenantId });
  }
}
