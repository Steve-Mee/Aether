import { CreateDecisionUseCase } from '../DecisionUseCases';
import type { DecisionRepository } from '../../../domain/repositories/DecisionRepository';
import type { PeerDelegationBridge } from '../../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';

jest.mock('../../../../../shared/audit/auditService', () => ({ writeAuditLog: jest.fn() }));
jest.mock('../../../../../shared/events/eventBus', () => ({ eventBus: { publish: jest.fn() } }));
jest.mock('../../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge', () => ({
  isAutonomyPeerEnabled: jest.fn(),
}));

import { isAutonomyPeerEnabled } from '../../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';

describe('CreateDecisionUseCase', () => {
  const repository: DecisionRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn().mockResolvedValue({
      id: 'dec_1',
      tenantId: 'tenant_1',
      type: 'pricing.adjust',
      result: 'increase 2%',
      createdAt: new Date(),
    }),
  };

  const peerBridge: PeerDelegationBridge = {
    isAvailable: jest.fn().mockReturnValue(true),
    runSpecialist: jest.fn().mockResolvedValue({ narrative: 'ok' }),
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isAutonomyPeerEnabled).mockReturnValue(true);
  });

  it('routes through autonomy agent when peer enabled', async () => {
    const useCase = new CreateDecisionUseCase(repository, peerBridge);
    await useCase.execute(
      { type: 'pricing.adjust', result: 'increase 2%', rationale: 'margin recovery' },
      { tenantId: 'tenant_1', actorId: 'user_1' }
    );

    expect(peerBridge.runSpecialist).toHaveBeenCalledWith(
      expect.objectContaining({
        agentKey: 'autonomy',
        intent: 'AUTONOMOUS_ROUTE',
        command: 'Autonomous decision pricing.adjust: increase 2%',
      })
    );
  });

  it('skips peer when autonomy peer disabled', async () => {
    jest.mocked(isAutonomyPeerEnabled).mockReturnValue(false);
    const useCase = new CreateDecisionUseCase(repository, peerBridge);
    await useCase.execute(
      { type: 'pricing.adjust', result: 'increase 2%' },
      { tenantId: 'tenant_1' }
    );
    expect(peerBridge.runSpecialist).not.toHaveBeenCalled();
  });
});
