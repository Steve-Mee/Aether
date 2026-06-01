import { PrismaClient } from '@prisma/client';
import { DecisionRepository, DecisionRecord } from '../../domain/repositories/DecisionRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaDecisionRepository implements DecisionRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(tenantId: string): Promise<DecisionRecord[]> {
    const tid = requireTenantId(tenantId, 'DecisionRepository.findAll');
    return this.prisma.decision.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string): Promise<DecisionRecord | null> {
    const tid = requireTenantId(tenantId, 'DecisionRepository.findById');
    return this.prisma.decision.findFirst({ where: { id, tenantId: tid } });
  }

  async create(data: {
    tenantId: string;
    type: string;
    result: string;
    rationale?: string;
    actor?: string;
  }): Promise<DecisionRecord> {
    const tid = requireTenantId(data.tenantId, 'DecisionRepository.create');
    return this.prisma.decision.create({
      data: {
        tenantId: tid,
        type: data.type,
        result: data.result,
        rationale: data.rationale,
        actor: data.actor,
      },
    });
  }
}
