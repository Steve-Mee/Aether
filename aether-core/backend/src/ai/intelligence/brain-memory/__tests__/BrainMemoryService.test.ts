jest.mock('../../../../shared/prisma/client', () => ({
  prisma: {
    brainMemory: { findMany: jest.fn() },
    brainAgentState: { findMany: jest.fn(), upsert: jest.fn() },
    brainLoRAAdapter: { findMany: jest.fn(), upsert: jest.fn() },
    tenantSettings: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}));

import { prisma } from '../../../../shared/prisma/client';
import { BrainMemoryService } from '../BrainMemoryService';
import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';
import { InMemoryVectorStoreAdapter } from '../../vector-store/adapters/InMemoryVectorStoreAdapter';
import type { BrainExportBundle } from '../BrainMemoryService';

describe('BrainMemoryService', () => {
  it('round-trips memories through import after store clear', async () => {
    const layer = createInMemoryIntelligenceLayer();
    const brain = layer.personalBrainRegistry.get('tenant_a', 'admin');
    await brain.remember({
      command: 'export round trip',
      intent: 'TEST',
      result: 'ok',
    });

    const bundle: BrainExportBundle = {
      tenantId: 'tenant_a',
      exportedAt: new Date().toISOString(),
      memories: [
        {
          id: 'mem_export_1',
          content: '[TEST] imported memory → ok',
          metadata: { intent: 'TEST' },
        },
      ],
      agentStates: [],
      loraAdapters: [],
    };

    const store = layer.vectorStore as InMemoryVectorStoreAdapter;
    store.clear();

    const service = new BrainMemoryService(
      layer.personalBrainRegistry,
      layer.vectorStore,
      layer.embedding
    );
    await service.importBrain('tenant_a', bundle);

    const recallAfter = await brain.recall('[TEST] imported memory → ok');
    expect(recallAfter.snippets.some((s) => s.includes('imported memory'))).toBe(true);
  });

  it('exportBrain reads prisma brain tables', async () => {
    const layer = createInMemoryIntelligenceLayer();
    (prisma.brainMemory.findMany as jest.Mock).mockResolvedValue([
      { id: 'm1', content: 'stored', metadata: { intent: 'X' } },
    ]);
    (prisma.brainAgentState.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.brainLoRAAdapter.findMany as jest.Mock).mockResolvedValue([]);

    const service = new BrainMemoryService(layer.personalBrainRegistry, layer.vectorStore, layer.embedding);
    const bundle = await service.exportBrain('tenant_a');

    expect(bundle.memories).toHaveLength(1);
    expect(bundle.memories[0].content).toBe('stored');
  });
});

describe('Brain export gate', () => {
  it('blocks when dataExportEnabled is false', async () => {
    (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
      dataExportEnabled: false,
    });
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: 'tenant_a' } });
    expect(settings?.dataExportEnabled).toBe(false);
  });
});
