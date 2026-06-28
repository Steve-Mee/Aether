import { prisma } from '../../../../shared/prisma/client';
import { notifyOverviewActivity } from '../../application/services/OverviewFeedNotify';

export interface CommandLogEntry {
  id: string;
  command: string;
  result: string | null;
  intent: string | null;
  confidence: number | null;
  createdAt: Date;
}

export class PrismaCommandLogRepository {
  async save(
    entry: {
      tenantId: string;
      command: string;
      intent?: string;
      result?: string;
      confidence?: number;
      actor?: string;
      brainMemoryId?: string;
      operationalMeta?: Record<string, unknown>;
    },
    options?: { undoable?: boolean; undoExpiresAt?: Date }
  ): Promise<CommandLogEntry> {
    const row = await prisma.command.create({
      data: {
        tenantId: entry.tenantId,
        command: entry.command,
        intent: entry.intent,
        result: entry.result,
        confidence: entry.confidence,
        actor: entry.actor,
        brainMemoryId: entry.brainMemoryId,
        operationalMeta: entry.operationalMeta ? JSON.stringify(entry.operationalMeta) : undefined,
        undoable: options?.undoable ?? false,
        undoExpiresAt: options?.undoExpiresAt,
      } as Parameters<typeof prisma.command.create>[0]['data'],
    });
    const saved: CommandLogEntry = {
      id: row.id,
      command: row.command,
      result: row.result,
      intent: row.intent,
      confidence: row.confidence,
      createdAt: row.createdAt,
    };
    notifyOverviewActivity(entry.tenantId, {
      id: `command-${saved.id}`,
      source: 'command',
      at: saved.createdAt.toISOString(),
      actionType: 'command_executed',
      actionLabel: 'Commando',
      description: saved.command,
      module: 'admin-command-bar',
      risk: 'low',
      status: saved.result ? 'autonomous' : 'info',
      executor: entry.actor ?? 'merchant',
    });
    return saved;
  }

  async findById(id: string, tenantId: string): Promise<CommandLogEntry | null> {
    const row = await prisma.command.findFirst({ where: { id, tenantId } });
    if (!row) return null;
    return {
      id: row.id,
      command: row.command,
      result: row.result,
      intent: row.intent,
      confidence: row.confidence,
      createdAt: row.createdAt,
    };
  }

  async findRecent(tenantId: string, limit = 50): Promise<CommandLogEntry[]> {
    const rows = await prisma.command.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      command: r.command,
      result: r.result,
      intent: r.intent,
      confidence: r.confidence,
      createdAt: r.createdAt,
    }));
  }
}
