import { prisma } from '../../../../shared/prisma/client';

export interface CommandLogEntry {
  id: string;
  command: string;
  result: string | null;
  intent: string | null;
  confidence: number | null;
  createdAt: Date;
}

export class PrismaCommandLogRepository {
  async save(entry: {
    tenantId: string;
    command: string;
    intent?: string;
    result?: string;
    confidence?: number;
    actor?: string;
  }): Promise<CommandLogEntry> {
    const row = await prisma.command.create({
      data: {
        tenantId: entry.tenantId,
        command: entry.command,
        intent: entry.intent,
        result: entry.result,
        confidence: entry.confidence,
        actor: entry.actor,
      },
    });
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
