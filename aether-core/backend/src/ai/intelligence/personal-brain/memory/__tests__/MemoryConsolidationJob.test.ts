import { MemoryConsolidationJob } from '../jobs/MemoryConsolidationJob';
import type { PersonalBrainMemoryService } from '../PersonalBrainMemoryService';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    tenant: {
      findMany: jest.fn().mockResolvedValue([{ id: 'tenant_a' }, { id: 'tenant_b' }]),
    },
  },
}));

describe('MemoryConsolidationJob', () => {
  it('does not start when disabled', () => {
    delete process.env.MEMORY_CONSOLIDATION_JOB_ENABLED;
    const memory = {
      pruneLongTerm: jest.fn(),
      pruneInteractionVectors: jest.fn(),
      consolidateTenant: jest.fn(),
    } as unknown as PersonalBrainMemoryService;
    const job = new MemoryConsolidationJob(() => memory);
    job.start();
    expect(memory.pruneLongTerm).not.toHaveBeenCalled();
    job.stop();
  });

  it('runs consolidation per tenant when enabled', async () => {
    process.env.MEMORY_CONSOLIDATION_JOB_ENABLED = 'true';
    const memory = {
      pruneLongTerm: jest.fn().mockResolvedValue(1),
      pruneInteractionVectors: jest.fn().mockResolvedValue(2),
      consolidateTenant: jest.fn().mockResolvedValue(3),
    } as unknown as PersonalBrainMemoryService;
    const job = new MemoryConsolidationJob(() => memory);
    await job.runAll();
    expect(memory.pruneLongTerm).toHaveBeenCalled();
    expect(memory.pruneInteractionVectors).toHaveBeenCalled();
    expect(memory.consolidateTenant).toHaveBeenCalled();
    delete process.env.MEMORY_CONSOLIDATION_JOB_ENABLED;
  });
});
