import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import type { PromotionRepository } from '../../domain/repositories/PromotionRepository';

export class ListPromotionsUseCase {
  constructor(private repo: PromotionRepository) {}

  async execute(tenantId: string) {
    const tid = requireTenantId(tenantId, 'ListPromotionsUseCase.execute');
    const promotions = await this.repo.listByTenant(tid);
    return { status: 'partial' as const, promotions };
  }
}
