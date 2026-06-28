import { SharedMemoryBridge } from '../SharedMemoryBridge';
import { SHARED_MEMORY_KEYS } from '../sharedMemorySchema';
import { createMockRunWorkingMemory } from './mockRunWorkingMemory';

describe('SharedMemoryBridge', () => {
  beforeEach(() => {
    process.env.MULTI_AGENT_RUN_MEMORY = 'true';
    process.env.NODE_ENV = 'development';
  });

  it('records peer handoff payload to canonical shared keys', async () => {
    const runMemory = createMockRunWorkingMemory();
    const bridge = new SharedMemoryBridge(runMemory);

    await bridge.recordPeerHandoff({
      tenantId: 't1',
      runId: 'run-1',
      sourceAgentKey: 'supplier',
      targetAgentKey: 'pricing',
      payload: { priceDrops: [{ sku: 'SKU-1', changePct: 10 }] },
    });

    expect(runMemory.mergeWithVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'shared',
        key: SHARED_MEMORY_KEYS.priceDrops,
        updatedByAgentKey: 'supplier',
      })
    );
  });

  it('records agent contributions after parallel join', async () => {
    const runMemory = createMockRunWorkingMemory();
    const bridge = new SharedMemoryBridge(runMemory);

    await bridge.recordContributions({
      tenantId: 't1',
      runId: 'run-1',
      contributions: [
        { agentKey: 'supplier', summary: 'Found price drop', status: 'completed' },
        { agentKey: 'pricing', summary: 'Suggested +5%', status: 'completed' },
      ],
    });

    expect(runMemory.set).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'shared',
        key: SHARED_MEMORY_KEYS.agentContributions,
      })
    );
  });

  it('appends notify decisions to recentDecisions', async () => {
    const runMemory = createMockRunWorkingMemory();
    const bridge = new SharedMemoryBridge(runMemory);

    await bridge.recordNotify({
      tenantId: 't1',
      runId: 'run-1',
      sourceAgentKey: 'inventory',
      targetAgentKey: 'pricing',
      intent: 'INVENTORY_STATUS',
      summary: 'Low stock alert',
      payload: { lowStockSkus: [{ sku: 'A', quantity: 2 }] },
    });

    expect(runMemory.appendToArray).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'shared',
        key: SHARED_MEMORY_KEYS.recentDecisions,
      })
    );
    expect(runMemory.set).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'shared',
        key: SHARED_MEMORY_KEYS.lowStockSkus,
      })
    );
  });
});
