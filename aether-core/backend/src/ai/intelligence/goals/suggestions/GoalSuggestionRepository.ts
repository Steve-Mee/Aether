import { prisma } from '../../../../shared/prisma/client';
import type { Prisma } from '@prisma/client';
import type { GoalSuggestionInput, GoalSuggestionRecord } from './types';
import type { GoalMetricType } from '../types';

function toRecord(row: {
  id: string;
  tenantId: string;
  dedupeKey: string;
  title: string;
  metricType: string;
  metricScope: unknown;
  suggestedTarget: number;
  suggestedBaseline: number;
  suggestedDeadline: Date;
  confidence: number;
  rationale: string;
  evidence: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): GoalSuggestionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    dedupeKey: row.dedupeKey,
    title: row.title,
    metricType: row.metricType as GoalMetricType,
    metricScope: (row.metricScope ?? {}) as Record<string, unknown>,
    suggestedTarget: row.suggestedTarget,
    suggestedBaseline: row.suggestedBaseline,
    suggestedDeadline: row.suggestedDeadline,
    confidence: row.confidence,
    rationale: row.rationale,
    evidence: (row.evidence ?? {}) as Record<string, unknown>,
    status: row.status as GoalSuggestionRecord['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class GoalSuggestionRepository {
  async upsertPending(tenantId: string, input: GoalSuggestionInput): Promise<GoalSuggestionRecord | null> {
    const existing = await prisma.goalSuggestion.findUnique({
      where: { tenantId_dedupeKey: { tenantId, dedupeKey: input.dedupeKey } },
    });
    if (existing && existing.status !== 'pending') return null;

    const row = await prisma.goalSuggestion.upsert({
      where: { tenantId_dedupeKey: { tenantId, dedupeKey: input.dedupeKey } },
      create: {
        tenantId,
        dedupeKey: input.dedupeKey,
        title: input.title,
        metricType: input.metricType,
        metricScope: (input.metricScope ?? {}) as Prisma.InputJsonValue,
        suggestedTarget: input.suggestedTarget,
        suggestedBaseline: input.suggestedBaseline,
        suggestedDeadline: input.suggestedDeadline,
        confidence: input.confidence,
        rationale: input.rationale,
        evidence: input.evidence as Prisma.InputJsonValue,
        status: 'pending',
      },
      update: {
        title: input.title,
        suggestedTarget: input.suggestedTarget,
        suggestedBaseline: input.suggestedBaseline,
        suggestedDeadline: input.suggestedDeadline,
        confidence: input.confidence,
        rationale: input.rationale,
        evidence: input.evidence as Prisma.InputJsonValue,
      },
    });
    return toRecord(row);
  }

  async listPending(tenantId: string, limit = 10): Promise<GoalSuggestionRecord[]> {
    const rows = await prisma.goalSuggestion.findMany({
      where: { tenantId, status: 'pending' },
      orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    return rows.map(toRecord);
  }

  async findById(tenantId: string, id: string): Promise<GoalSuggestionRecord | null> {
    const row = await prisma.goalSuggestion.findFirst({ where: { id, tenantId } });
    return row ? toRecord(row) : null;
  }

  async markAccepted(tenantId: string, id: string): Promise<void> {
    await prisma.goalSuggestion.updateMany({
      where: { id, tenantId },
      data: { status: 'accepted' },
    });
  }

  async markDismissed(tenantId: string, id: string): Promise<void> {
    await prisma.goalSuggestion.updateMany({
      where: { id, tenantId },
      data: { status: 'dismissed' },
    });
  }
}
