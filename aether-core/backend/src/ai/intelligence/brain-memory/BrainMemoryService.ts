import type { PersonalBrainRegistry } from '../personal-brain/PersonalBrainRegistry';
import type { LoRAAdapterRegistryPort } from '../personal-brain/LoRAAdapterRegistryPort';
import { prisma } from '../../../shared/prisma/client';
import { requireTenantId } from '../../../shared/tenant/tenantContext';
import type { VectorStorePort } from '../vector-store/VectorStorePort';
import { PrismaPgVectorAdapter } from '../vector-store/adapters/PrismaPgVectorAdapter';
import { createProductionEmbedding } from '../vector-store/ResilientEmbeddingAdapter';

export interface BrainExportBundle {
  tenantId: string;
  exportedAt: string;
  memories: Array<{
    id: string;
    content: string;
    metadata: unknown;
  }>;
  agentStates: Array<{ sessionKey: string; state: unknown }>;
  loraAdapters: Array<{
    adapterId: string;
    version: string;
    storagePath: string;
    traits: unknown;
    enabled: boolean;
  }>;
}

export class BrainMemoryService {
  constructor(
    private personalBrains: PersonalBrainRegistry,
    private vectorStore: VectorStorePort = new PrismaPgVectorAdapter(),
    private embedding = createProductionEmbedding()
  ) {}

  async exportBrain(tenantId: string): Promise<BrainExportBundle> {
    const tid = requireTenantId(tenantId, 'BrainMemoryService.exportBrain');
    const memories = await prisma.brainMemory.findMany({
      where: { tenantId: tid },
      select: { id: true, content: true, metadata: true },
    });
    const agentStates = await prisma.brainAgentState.findMany({
      where: { tenantId: tid },
      select: { sessionKey: true, state: true },
    });
    const loraAdapters = await prisma.brainLoRAAdapter.findMany({
      where: { tenantId: tid },
    });

    return {
      tenantId: tid,
      exportedAt: new Date().toISOString(),
      memories,
      agentStates,
      loraAdapters: loraAdapters.map((a: (typeof loraAdapters)[0]) => ({
        adapterId: a.adapterId,
        version: a.version,
        storagePath: a.storagePath,
        traits: a.traits,
        enabled: a.enabled,
      })),
    };
  }

  async importBrain(tenantId: string, bundle: BrainExportBundle): Promise<void> {
    const tid = requireTenantId(tenantId, 'BrainMemoryService.importBrain');
    const brain = this.personalBrains.get(tid, 'admin');

    for (const mem of bundle.memories) {
      const vec = await this.embedding.embed(mem.content);
      await this.vectorStore.upsert(tid, {
        id: mem.id,
        content: mem.content,
        metadata: (mem.metadata as Record<string, unknown>) ?? undefined,
        embedding: vec,
      });
    }

    for (const state of bundle.agentStates) {
      await prisma.brainAgentState.upsert({
        where: { tenantId_sessionKey: { tenantId: tid, sessionKey: state.sessionKey } },
        create: { tenantId: tid, sessionKey: state.sessionKey, state: state.state as object },
        update: { state: state.state as object },
      });
    }

    for (const lora of bundle.loraAdapters) {
      await prisma.brainLoRAAdapter.upsert({
        where: { tenantId_adapterId: { tenantId: tid, adapterId: lora.adapterId } },
        create: {
          tenantId: tid,
          adapterId: lora.adapterId,
          version: lora.version,
          storagePath: lora.storagePath,
          traits: lora.traits as object,
          enabled: lora.enabled,
        },
        update: {
          version: lora.version,
          storagePath: lora.storagePath,
          traits: lora.traits as object,
          enabled: lora.enabled,
        },
      });
    }

    await brain.updateAgentState({ lastIntent: 'import', lastCommandAt: new Date().toISOString() });
  }
}
