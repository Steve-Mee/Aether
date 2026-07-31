export type PromotionType = 'percent' | 'fixed';
export type PromotionStatus = 'draft' | 'active' | 'scheduled' | 'ended' | 'archived';

export class Promotion {
  constructor(
    public id: string,
    public tenantId: string,
    public name: string,
    public type: PromotionType = 'percent',
    public value: number = 0,
    public status: PromotionStatus = 'draft',
    public code?: string | null,
    public startsAt?: Date | null,
    public endsAt?: Date | null,
    public configJson?: Record<string, unknown> | null,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
}
