import { prisma } from '../../../../shared/prisma/client';
import { writeAuditLog } from '../../../../shared/audit/auditService';

export class UndoCommandUseCase {
  async execute(commandId: string, ctx: { tenantId: string; actorId?: string }) {
    const row = await prisma.command.findFirst({
      where: { id: commandId, tenantId: ctx.tenantId },
    });

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

    await prisma.command.update({
      where: { id: commandId },
      data: { revertedAt: new Date() },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'admin-command-bar',
      action: 'command.undo',
      actor: ctx.actorId,
      details: { commandId, intent: row.intent, originalCommand: row.command },
    });

    return {
      success: true,
      commandId,
      message: 'Commando teruggedraaid',
      intent: row.intent,
    };
  }
}
