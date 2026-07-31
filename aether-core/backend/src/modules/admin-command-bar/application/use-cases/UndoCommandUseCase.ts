import { writeAuditLog } from '../../../../shared/audit/auditService';
import type { AdminDataPort } from '../ports/AdminDataPort';
import type { CommandLogPort } from '../ports/CommandLogPort';
import type { PersonalBrainRegistry } from '../../../../ai/intelligence/personal-brain/PersonalBrainRegistry';
import type { PersonalBrainMemoryService } from '../../../../ai/intelligence/personal-brain/memory/PersonalBrainMemoryService';

export interface UndoCommandDeps {
  commandLog: CommandLogPort;
  personalBrainRegistry: PersonalBrainRegistry;
  personalBrainMemory?: PersonalBrainMemoryService;
  adminData: AdminDataPort;
}

export class UndoCommandUseCase {
  constructor(private deps: UndoCommandDeps) {}

  async execute(commandId: string, ctx: { tenantId: string; actorId?: string }) {
    const row = await this.deps.commandLog.findForUndo(commandId, ctx.tenantId);

    if (!row) {
      throw new Error('Command not found');
    }
    if (row.revertedAt) {
      throw new Error('Command already reverted');
    }
    if (!row.undoable) {
      throw new Error('Command is not undoable');
    }
    if (row.undoExpiresAt && row.undoExpiresAt.getTime() < Date.now()) {
      throw new Error('Undo window expired');
    }

    let brainMemoryDeleted = false;
    if (row.brainMemoryId && this.deps.personalBrainMemory) {
      try {
        await this.deps.personalBrainMemory.removeByBrainMemoryId(ctx.tenantId, row.brainMemoryId);
        brainMemoryDeleted = true;
      } catch {
        // Best-effort memory rollback
      }
    } else if (row.brainMemoryId && this.deps.personalBrainRegistry) {
      try {
        const brain = this.deps.personalBrainRegistry.get(ctx.tenantId, 'admin');
        await brain.forgetMemory(row.brainMemoryId);
        brainMemoryDeleted = true;
      } catch {
        // Best-effort memory rollback
      }
    }

    let priceRollbackCount = 0;
    if (row.intent === 'PRICE_UPDATE' && row.operationalMeta && this.deps.adminData) {
      try {
        const meta = JSON.parse(row.operationalMeta) as {
          priceRollback?: { previousPrices?: Array<{ id: string; price: number }> };
        };
        const previousPrices = meta.priceRollback?.previousPrices;
        if (previousPrices?.length) {
          priceRollbackCount = await this.deps.adminData.restoreProductPrices(
            ctx.tenantId,
            previousPrices
          );
        }
      } catch {
        // Best-effort price rollback
      }
    }

    await this.deps.commandLog.markReverted(commandId);

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'admin-command-bar',
      action: 'command.undo',
      actor: ctx.actorId,
      details: {
        commandId,
        intent: row.intent,
        originalCommand: row.command,
        brainMemoryDeleted,
        priceRollbackCount,
      },
    });

    return {
      success: true,
      commandId,
      message: 'Commando teruggedraaid',
      intent: row.intent,
      brainMemoryDeleted,
      priceRollbackCount,
    };
  }
}
