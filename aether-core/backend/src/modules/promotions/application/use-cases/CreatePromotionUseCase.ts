import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import type {
  CreatePromotionInput,
  PromotionRepository,
} from '../../domain/repositories/PromotionRepository';

export class CreatePromotionUseCase {
  constructor(private repo: PromotionRepository) {}

  async execute(tenantId: string, input: CreatePromotionInput) {
    const tid = requireTenantId(tenantId, 'CreatePromotionUseCase.execute');
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new Error('name is required');
    }
    const promotion = await this.repo.create(tid, {
      ...input,
      name,
      status: input.status ?? 'draft',
    });
    return { status: 'partial' as const, promotion };
  }
}
