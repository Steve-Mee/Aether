import { AgentPeerJobWorker } from '../AgentPeerJobWorker';
import type { AgentPeerJobPort, AgentPeerJobRecord } from '../AgentPeerJobPort';
import type { AgentPeerPort } from '../../AgentPeerPort';
import type { AgentOrchestrator } from '../../../AgentSupervisorOrchestrator';

jest.mock('../../../../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

describe('AgentPeerJobWorker notify mode', () => {
  it('completes notify job without resuming parent orchestrator', async () => {
    const job: AgentPeerJobRecord = {
      id: 'job-1',
      tenantId: 't1',
      status: 'pending',
      sourceAgentKey: 'inventory',
      targetAgentKey: 'pricing',
      intent: 'PRICING_OPTIMIZE',
      query: 'notify only',
      parentRunId: 'parent-run',
      jobMode: 'notify',
      messageType: 'notify',
      contextPayload: null,
      resultPayload: null,
      error: null,
      idempotencyKey: null,
      actorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    const jobPort: AgentPeerJobPort = {
      getById: jest.fn().mockResolvedValue(job),
      enqueue: jest.fn(),
      complete: jest.fn(),
      fail: jest.fn(),
      claimNext: jest.fn(),
      getByParentRunId: jest.fn(),
    };

    const peerBus: AgentPeerPort = {
      requestPeerHandoff: jest.fn().mockResolvedValue({
        success: true,
        narrative: 'Notify delivered',
      }),
    };

    const orchestrator = {
      resumeFromChild: jest.fn(),
    } as unknown as AgentOrchestrator;

    const worker = new AgentPeerJobWorker({ jobPort, peerBus, orchestrator });
    await worker.processJob('job-1', 't1');

    expect(peerBus.requestPeerHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        contextPayload: expect.objectContaining({ messageType: 'notify' }),
      })
    );
    expect(jobPort.complete).toHaveBeenCalledWith('job-1', 't1', {
      narrative: 'Notify delivered',
      agentRunId: undefined,
    });
    expect(orchestrator.resumeFromChild).not.toHaveBeenCalled();
  });
});
