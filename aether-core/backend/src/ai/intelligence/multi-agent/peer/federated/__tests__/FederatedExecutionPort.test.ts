import { FederatedExecutionPort } from '../FederatedExecutionPort';
import { FederatedExecutionGate } from '../FederatedExecutionGate';
import type { AgentPatternSyncService } from '../../../../global-knowledge/agent-patterns/AgentPatternSyncService';

jest.mock('../../../../../../shared/prisma/client', () => ({
  prisma: {
    federatedExecutionAudit: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

describe('FederatedExecutionPort', () => {
  const prevEnv = process.env.BRAIN_FEDERATED_EXECUTION_ENABLED;

  afterEach(() => {
    process.env.BRAIN_FEDERATED_EXECUTION_ENABLED = prevEnv;
    jest.restoreAllMocks();
  });

  it('rejects when gate disabled', async () => {
    process.env.BRAIN_FEDERATED_EXECUTION_ENABLED = 'false';
    const sync = {
      getContextSnippets: jest.fn(),
    } as unknown as AgentPatternSyncService;
    const gate = new FederatedExecutionGate();
    jest.spyOn(gate, 'isConsumerEnabled').mockResolvedValue(false);

    const port = new FederatedExecutionPort(sync, gate);
    const result = await port.requestSandboxExecution({
      tenantId: 't1',
      sourceAgentKey: 'pricing',
      capability: 'inventory-trends',
    });
    expect(result.success).toBe(false);
    expect(sync.getContextSnippets).not.toHaveBeenCalled();
  });

  it('returns distilled summary without raw tenant identifiers', async () => {
    process.env.BRAIN_FEDERATED_EXECUTION_ENABLED = 'true';
    const sync = {
      getContextSnippets: jest.fn().mockResolvedValue([
        'tenant_xyz prefers SKU-999 at €49.99',
      ]),
    } as unknown as AgentPatternSyncService;
    const gate = new FederatedExecutionGate();
    jest.spyOn(gate, 'isConsumerEnabled').mockResolvedValue(true);

    const port = new FederatedExecutionPort(sync, gate);
    const result = await port.requestSandboxExecution({
      tenantId: 't1',
      sourceAgentKey: 'pricing',
      capability: 'inventory-trends',
      queryHint: 'secret hint not forwarded',
    });
    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.summary).not.toMatch(/tenant_xyz/i);
    expect(result.summary).not.toMatch(/€49\.99/);
  });
});
