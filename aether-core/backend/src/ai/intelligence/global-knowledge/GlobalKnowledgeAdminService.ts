import { writeAuditLog } from '../../../shared/audit/auditService';
import { GlobalKnowledgePatchRepository } from './GlobalKnowledgePatchRepository';
import type { CreatePatchInput, UpdatePatchInput } from './GlobalKnowledgePatchRepository';

export class GlobalKnowledgeAdminService {
  constructor(private repo = new GlobalKnowledgePatchRepository()) {}

  listPatches(status?: string) {
    if (status === 'draft' || status === 'active' || status === 'retired') {
      return this.repo.listByStatus(status);
    }
    return this.repo.listByStatus(['draft', 'active', 'retired']);
  }

  createPatch(input: CreatePatchInput, actorId?: string) {
    return this.repo.create({ ...input, createdBy: actorId });
  }

  updatePatch(id: string, input: UpdatePatchInput) {
    return this.repo.update(id, input);
  }

  async publishPatch(id: string, tenantId: string, actorId?: string) {
    const row = await this.repo.publish(id);
    await writeAuditLog({
      tenantId,
      module: 'global-knowledge',
      action: 'patch_published',
      actor: actorId,
      details: { patchKey: row.patchKey, id: row.id },
    });
    return row;
  }

  async publishDistilledPatch(id: string, tenantId: string) {
    return this.publishPatch(id, tenantId, 'system:distillation');
  }

  async retirePatch(id: string, tenantId: string, actorId?: string) {
    const row = await this.repo.retire(id);
    await writeAuditLog({
      tenantId,
      module: 'global-knowledge',
      action: 'patch_retired',
      actor: actorId,
      details: { patchKey: row.patchKey, id: row.id },
    });
    return row;
  }

  getSyncHistory(tenantId: string) {
    return this.repo.listSyncHistory(tenantId);
  }
}
