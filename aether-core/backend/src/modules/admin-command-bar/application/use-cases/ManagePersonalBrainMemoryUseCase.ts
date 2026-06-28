import type { PersonalBrainMemoryService } from '../../../../ai/intelligence/personal-brain/memory/PersonalBrainMemoryService';
import type { MemoryKind } from '../../../../ai/intelligence/personal-brain/memory/types';

export class ManagePersonalBrainMemoryUseCase {
  constructor(private memory: PersonalBrainMemoryService) {}

  async getSummary(tenantId: string) {
    return this.memory.getSummary(tenantId);
  }

  async listEntries(tenantId: string, kind?: MemoryKind, limit = 50) {
    return this.memory.listEntries(tenantId, kind, limit);
  }

  async deleteEntry(tenantId: string, id: string) {
    await this.memory.removeByBrainMemoryId(tenantId, id);
    return { success: true, id };
  }

  async clearShortTerm(tenantId: string) {
    await this.memory.clearShortTerm(tenantId);
    return { success: true };
  }

  async clearConversation(tenantId: string) {
    await this.memory.clearConversation(tenantId);
    return { success: true };
  }

  async consolidate(tenantId: string) {
    const factsWritten = await this.memory.consolidateTenant(tenantId);
    const pruned = await this.memory.pruneLongTerm(tenantId);
    const interactionPruned = await this.memory.pruneInteractionVectors(tenantId);
    return { success: true, factsWritten, pruned, interactionPruned };
  }
}
