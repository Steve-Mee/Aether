jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    command: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../../../../../shared/prisma/client';
import { UndoCommandUseCase } from '../UndoCommandUseCase';

describe('UndoCommandUseCase', () => {
  const mockForgetMemory = jest.fn().mockResolvedValue(undefined);
  const mockRestorePrices = jest.fn().mockResolvedValue(1);

  const deps = {
    personalBrainRegistry: {
      get: jest.fn().mockReturnValue({ forgetMemory: mockForgetMemory }),
    },
    adminData: {
      restoreProductPrices: mockRestorePrices,
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes brain memory and restores prices on PRICE_UPDATE undo', async () => {
    (prisma.command.findFirst as jest.Mock).mockResolvedValue({
      id: 'cmd_1',
      tenantId: 'tenant_1',
      intent: 'PRICE_UPDATE',
      command: 'verhoog prijs',
      undoable: true,
      revertedAt: null,
      undoExpiresAt: new Date(Date.now() + 60000),
      brainMemoryId: 'mem_abc123',
      operationalMeta: JSON.stringify({
        priceRollback: { previousPrices: [{ id: 'p1', price: 49.99 }] },
      }),
    });
    (prisma.command.update as jest.Mock).mockResolvedValue({});

    const useCase = new UndoCommandUseCase(deps);
    const result = await useCase.execute('cmd_1', { tenantId: 'tenant_1', actorId: 'user_1' });

    expect(result.success).toBe(true);
    expect(result.brainMemoryDeleted).toBe(true);
    expect(result.priceRollbackCount).toBe(1);
    expect(mockForgetMemory).toHaveBeenCalledWith('mem_abc123');
    expect(mockRestorePrices).toHaveBeenCalledWith('tenant_1', [{ id: 'p1', price: 49.99 }]);
  });
});
