import type { Promotion } from '../entities/Promotion';

export interface CreatePromotionInput {
  name: string;
  type?: Promotion['type'];
  value?: number;
  code?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  status?: Promotion['status'];
  configJson?: Record<string, unknown> | null;
}

export interface PromotionRepository {
  listByTenant(tenantId: string): Promise<Promotion[]>;
  create(tenantId: string, input: CreatePromotionInput): Promise<Promotion>;
}
