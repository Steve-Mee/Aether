import { createBrainToolProposal } from '../BrainToolProposalStore';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    brainToolProposal: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../../../../shared/approval/approvalService', () => ({
  createApproval: jest.fn(),
}));

jest.mock('../../../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../../../../../shared/prisma/client';
import { createApproval } from '../../../../../shared/approval/approvalService';
import { writeAuditLog } from '../../../../../shared/audit/auditService';

describe('BrainToolProposalStore approval flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.brainToolProposal.create as jest.Mock).mockResolvedValue({
      id: 'prop-1',
      tool: 'updatePrice',
      summary: 'Prijs +15%',
      risk: 'high',
    });
    (createApproval as jest.Mock).mockResolvedValue({ id: 'approval-1', status: 'pending' });
    (prisma.brainToolProposal.update as jest.Mock).mockResolvedValue({});
  });

  it('creates enriched approval payload and audit log for medium/high proposals', async () => {
    const result = await createBrainToolProposal({
      tenantId: 'tenant-1',
      tool: 'updatePrice',
      summary: 'Prijs +15% voor Widget',
      risk: 'high',
      payload: { productIds: ['p1'], percentage: 15 },
      actorId: 'merchant-1',
      commandId: 'cmd-1',
      requiresInbox: true,
      expectedImpact: 'Marge kan verschuiven · 15%',
      confidence: 0.58,
      rationale: 'Grote prijswijziging vereist review.',
    });

    expect(createApproval).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      module: 'admin-command-bar',
      actionType: 'brain.updatePrice',
      payload: expect.objectContaining({
        proposalId: 'prop-1',
        tool: 'updatePrice',
        summary: 'Prijs +15% voor Widget',
        risk: 'high',
        confidence: 0.58,
        expectedImpact: 'Marge kan verschuiven · 15%',
        rationale: 'Grote prijswijziging vereist review.',
        source: 'personal-brain',
        commandId: 'cmd-1',
      }),
      requestedBy: 'merchant-1',
    });

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'brain_approval_created',
        details: expect.objectContaining({
          approvalId: 'approval-1',
          proposalId: 'prop-1',
          tool: 'updatePrice',
        }),
      })
    );

    expect(result.approvalId).toBe('approval-1');
    expect(result.expectedImpact).toBe('Marge kan verschuiven · 15%');
  });

  it('skips approval for low-risk proposals without inbox flag', async () => {
    (prisma.brainToolProposal.create as jest.Mock).mockResolvedValue({
      id: 'prop-2',
      tool: 'createInsight',
      summary: 'Insight opslaan',
      risk: 'low',
    });

    const result = await createBrainToolProposal({
      tenantId: 'tenant-1',
      tool: 'createInsight',
      summary: 'Insight opslaan',
      risk: 'low',
      payload: { metric: 'sales', summary: 'test' },
      requiresInbox: false,
    });

    expect(createApproval).not.toHaveBeenCalled();
    expect(result.approvalId).toBeUndefined();
    expect(result.requiresApproval).toBe(false);
  });
});
