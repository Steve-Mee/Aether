import { readRunMemoryTool, writeRunMemoryTool } from '../runMemoryTools';
import { createMockRunWorkingMemory } from './mockRunWorkingMemory';

describe('runMemoryTools ACL', () => {
  beforeEach(() => {
    process.env.MULTI_AGENT_RUN_MEMORY = 'true';
    process.env.NODE_ENV = 'development';
  });

  const ctx = {
    tenantId: 't1',
    parentRunId: 'run-1',
    agentKey: 'pricing',
  };

  it('denies cross-namespace read without read scope', async () => {
    const runMemory = createMockRunWorkingMemory();
    const tool = readRunMemoryTool({ runMemory });

    const result = (await tool.executeRead!(
      { ...ctx, agentKey: 'inventory' } as never,
      { namespace: 'negotiation', key: 'roundState' }
    )) as { success: boolean; error?: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot read');
  });

  it('allows pricing to read supplier namespace', async () => {
    const runMemory = createMockRunWorkingMemory({
      getWithVersion: jest.fn().mockResolvedValue({ value: { narrative: 'intel' }, version: 2 }),
    });
    const tool = readRunMemoryTool({ runMemory });

    const result = (await tool.executeRead!(ctx as never, {
      namespace: 'supplier',
      key: 'lastNarrative',
    })) as { success: boolean; version?: number };

    expect(result.success).toBe(true);
    expect(result.version).toBe(2);
  });

  it('validates shared memory schema on write', async () => {
    const runMemory = createMockRunWorkingMemory();
    const tool = writeRunMemoryTool({ runMemory });

    const result = (await tool.executeRead!(ctx as never, {
      namespace: 'shared',
      key: 'priceDrops',
      value: { not: 'array' },
    })) as { success: boolean; error?: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('array');
  });
});
