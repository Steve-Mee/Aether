import { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaSelfEvolvingAdapter {
  async createProposal(
    tenantId: string,
    data: {
      module: string;
      type: string;
      description: string;
      confidence: number;
      status: string;
    }
  ) {
    const tid = requireTenantId(tenantId, 'SelfEvolving.createProposal');
    return prisma.improvementProposal.create({ data: { tenantId: tid, ...data } });
  }

  async listProposals(tenantId: string) {
    const tid = requireTenantId(tenantId, 'SelfEvolving.listProposals');
    return prisma.improvementProposal.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProposal(tenantId: string, id: string) {
    const tid = requireTenantId(tenantId, 'SelfEvolving.findProposal');
    return prisma.improvementProposal.findFirst({ where: { id, tenantId: tid } });
  }

  async updateProposalStatus(id: string, status: string, appliedConfig?: Prisma.InputJsonValue) {
    return prisma.improvementProposal.update({
      where: { id },
      data: {
        status,
        ...(appliedConfig !== undefined ? { appliedConfig } : {}),
      },
    });
  }

  async countProposals(tenantId: string, status?: string) {
    const tid = requireTenantId(tenantId, 'SelfEvolving.countProposals');
    return prisma.improvementProposal.count({
      where: { tenantId: tid, ...(status ? { status } : {}) },
    });
  }

  async countPendingApprovals(tenantId: string) {
    const tid = requireTenantId(tenantId, 'SelfEvolving.countPendingApprovals');
    return prisma.approval.count({
      where: { tenantId: tid, status: 'pending', module: 'self-evolving-codebase' },
    });
  }
}
