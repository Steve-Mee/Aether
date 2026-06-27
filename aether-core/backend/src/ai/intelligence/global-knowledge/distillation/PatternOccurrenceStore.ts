import crypto from 'crypto';
import { prisma } from '../../../../shared/prisma/client';

export class PatternOccurrenceStore {
  hashPattern(intent: string, content: string): string {
    return crypto.createHash('sha256').update(`${intent}:${content}`).digest('hex').slice(0, 24);
  }

  async increment(tenantId: string, intent: string, content: string): Promise<number> {
    const patternHash = this.hashPattern(intent, content);
    const row = await prisma.distilledPatternOccurrence.upsert({
      where: { tenantId_patternHash: { tenantId, patternHash } },
      create: { tenantId, patternHash, intent, occurrenceCount: 1 },
      update: { occurrenceCount: { increment: 1 } },
    });
    return row.occurrenceCount;
  }

  async getCount(tenantId: string, intent: string, content: string): Promise<number> {
    const patternHash = this.hashPattern(intent, content);
    const row = await prisma.distilledPatternOccurrence.findUnique({
      where: { tenantId_patternHash: { tenantId, patternHash } },
    });
    return row?.occurrenceCount ?? 0;
  }
}
