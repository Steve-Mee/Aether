import { PrismaClient, Prisma } from '@prisma/client';
import { Promotion } from '../../domain/entities/Promotion';
import type {
  CreatePromotionInput,
  PromotionRepository,
} from '../../domain/repositories/PromotionRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaPromotionRepository implements PromotionRepository {
  constructor(private prisma: PrismaClient) {}

  async listByTenant(tenantId: string): Promise<Promotion[]> {
    const tid = requireTenantId(tenantId, 'PrismaPromotionRepository.listByTenant');
    const rows = await this.prisma.promotion.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async create(tenantId: string, input: CreatePromotionInput): Promise<Promotion> {
    const tid = requireTenantId(tenantId, 'PrismaPromotionRepository.create');
    const row = await this.prisma.promotion.create({
      data: {
        tenantId: tid,
        name: input.name,
        type: input.type ?? 'percent',
        value: input.value ?? 0,
        code: input.code ?? null,
        status: input.status ?? 'draft',
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        configJson: (input.configJson ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return this.toDomain(row);
  }

  private toDomain(row: {
    id: string;
    tenantId: string;
    name: string;
    type: string;
    value: number;
    status: string;
    code: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    configJson: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promotion {
    return new Promotion(
      row.id,
      row.tenantId,
      row.name,
      (row.type as Promotion['type']) || 'percent',
      row.value,
      (row.status as Promotion['status']) || 'draft',
      row.code,
      row.startsAt,
      row.endsAt,
      row.configJson && typeof row.configJson === 'object' && !Array.isArray(row.configJson)
        ? (row.configJson as Record<string, unknown>)
        : null,
      row.createdAt,
      row.updatedAt
    );
  }
}
