import { prisma } from '../../../shared/prisma/client';
import type { ProactiveFinding } from './ProactiveTriggerDefinition';
import { PROACTIVE_SUGGESTION_TTL_MS } from './proactiveConfig';

export interface ProactiveSuggestionRecord {
  id: string;
  tenantId: string;
  triggerId: string;
  dedupeKey: string;
  agentKey: string | null;
  title: string;
  summary: string | null;
  command: string;
  intentId: string;
  category: string;
  riskLevel: string;
  executionMode: string;
  status: string;
  snoozedUntil: Date | null;
  evidence: Record<string, unknown>;
  priority: number;
  expiresAt: Date | null;
  clusterKey: string | null;
  enrichedAt: Date | null;
  enrichmentSource: string | null;
  detectionRunId: string | null;
  orchestrationSource: string | null;
  goalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertFindingResult {
  record: ProactiveSuggestionRecord;
  created: boolean;
}

function toRecord(row: {
  id: string;
  tenantId: string;
  triggerId: string;
  dedupeKey: string;
  agentKey: string | null;
  title: string;
  summary: string | null;
  command: string;
  intentId: string;
  category: string;
  riskLevel: string;
  executionMode: string;
  status: string;
  snoozedUntil: Date | null;
  evidence: unknown;
  priority: number;
  expiresAt: Date | null;
  clusterKey?: string | null;
  enrichedAt?: Date | null;
  enrichmentSource?: string | null;
  detectionRunId?: string | null;
  orchestrationSource?: string | null;
  goalId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProactiveSuggestionRecord {
  return {
    ...row,
    clusterKey: row.clusterKey ?? null,
    enrichedAt: row.enrichedAt ?? null,
    enrichmentSource: row.enrichmentSource ?? null,
    detectionRunId: row.detectionRunId ?? null,
    orchestrationSource: row.orchestrationSource ?? null,
    goalId: row.goalId ?? null,
    evidence:
      row.evidence && typeof row.evidence === 'object' && !Array.isArray(row.evidence)
        ? (row.evidence as Record<string, unknown>)
        : {},
  };
}

export class ProactiveSuggestionRepository {
  async upsertFinding(
    tenantId: string,
    finding: ProactiveFinding,
    cooldownMs: number
  ): Promise<UpsertFindingResult | null> {
    const existing = await prisma.proactiveSuggestion.findUnique({
      where: { tenantId_dedupeKey: { tenantId, dedupeKey: finding.dedupeKey } },
    });

    if (existing) {
      if (existing.status === 'dismissed' || existing.status === 'executed') {
        return null;
      }
      if (
        existing.status === 'snoozed' &&
        existing.snoozedUntil &&
        existing.snoozedUntil > new Date()
      ) {
        return null;
      }
      const cooldownEnd = new Date(existing.updatedAt.getTime() + cooldownMs);
      if (cooldownEnd > new Date() && existing.status === 'active') {
        return { record: toRecord(existing), created: false };
      }
    }

    const expiresAt = new Date(Date.now() + PROACTIVE_SUGGESTION_TTL_MS);
    const row = await prisma.proactiveSuggestion.upsert({
      where: { tenantId_dedupeKey: { tenantId, dedupeKey: finding.dedupeKey } },
      create: {
        tenantId,
        triggerId: finding.triggerId,
        dedupeKey: finding.dedupeKey,
        agentKey: finding.agentKey,
        title: finding.title,
        summary: finding.summary ?? null,
        command: finding.command,
        intentId: finding.intentId,
        category: finding.category,
        riskLevel: finding.riskLevel,
        executionMode: finding.executionMode,
        status: 'active',
        evidence: finding.evidence,
        priority: finding.priority,
        expiresAt,
        clusterKey: finding.clusterKey ?? null,
        enrichmentSource: 'template',
        goalId: finding.goalId ?? null,
      },
      update: {
        title: finding.title,
        summary: finding.summary ?? null,
        command: finding.command,
        intentId: finding.intentId,
        category: finding.category,
        riskLevel: finding.riskLevel,
        executionMode: finding.executionMode,
        status: 'active',
        snoozedUntil: null,
        evidence: finding.evidence,
        priority: finding.priority,
        expiresAt,
        clusterKey: finding.clusterKey ?? null,
        goalId: finding.goalId ?? null,
      },
    });
    return { record: toRecord(row), created: !existing };
  }

  async updateOrchestration(
    tenantId: string,
    id: string,
    data: {
      title: string;
      summary: string | null;
      command: string;
      detectionRunId: string;
      orchestrationSource: string;
    }
  ): Promise<boolean> {
    const result = await prisma.proactiveSuggestion.updateMany({
      where: { id, tenantId, status: 'active', detectionRunId: null },
      data: {
        title: data.title,
        summary: data.summary,
        command: data.command,
        detectionRunId: data.detectionRunId,
        orchestrationSource: data.orchestrationSource,
        enrichedAt: new Date(),
        enrichmentSource: data.orchestrationSource,
      },
    });
    return result.count > 0;
  }

  async listActive(tenantId: string, limit = 20): Promise<ProactiveSuggestionRecord[]> {
    const now = new Date();
    const rows = await prisma.proactiveSuggestion.findMany({
      where: {
        tenantId,
        status: { in: ['active', 'snoozed'] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });

    return rows
      .filter((r) => r.status !== 'snoozed' || !r.snoozedUntil || r.snoozedUntil <= now)
      .map(toRecord);
  }

  async listPendingEnrichment(tenantId: string, limit = 5): Promise<ProactiveSuggestionRecord[]> {
    const rows = await prisma.proactiveSuggestion.findMany({
      where: {
        tenantId,
        status: 'active',
        enrichedAt: null,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });
    return rows.map(toRecord);
  }

  async listAutoExecuteCandidates(
    tenantId: string,
    limit = 3
  ): Promise<ProactiveSuggestionRecord[]> {
    const rows = await prisma.proactiveSuggestion.findMany({
      where: {
        tenantId,
        status: 'active',
        riskLevel: 'low',
        executionMode: 'autonomous',
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });
    return rows.map(toRecord);
  }

  async updateEnrichment(
    tenantId: string,
    id: string,
    data: { title: string; summary: string | null; enrichmentSource: string }
  ): Promise<boolean> {
    const result = await prisma.proactiveSuggestion.updateMany({
      where: { id, tenantId, status: 'active' },
      data: {
        title: data.title,
        summary: data.summary,
        enrichmentSource: data.enrichmentSource,
        enrichedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  async dismiss(tenantId: string, id: string): Promise<boolean> {
    const result = await prisma.proactiveSuggestion.updateMany({
      where: { id, tenantId, status: { in: ['active', 'snoozed'] } },
      data: { status: 'dismissed' },
    });
    return result.count > 0;
  }

  async snooze(tenantId: string, id: string, until: Date): Promise<boolean> {
    const result = await prisma.proactiveSuggestion.updateMany({
      where: { id, tenantId, status: { in: ['active', 'snoozed'] } },
      data: { status: 'snoozed', snoozedUntil: until },
    });
    return result.count > 0;
  }

  async markExecuted(tenantId: string, id: string): Promise<boolean> {
    const result = await prisma.proactiveSuggestion.updateMany({
      where: { id, tenantId },
      data: { status: 'executed' },
    });
    return result.count > 0;
  }

  async expireStale(tenantId?: string): Promise<number> {
    const now = new Date();
    const result = await prisma.proactiveSuggestion.updateMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { in: ['active', 'snoozed'] },
        expiresAt: { lte: now },
      },
      data: { status: 'expired' },
    });
    return result.count;
  }

  async findById(tenantId: string, id: string): Promise<ProactiveSuggestionRecord | null> {
    const row = await prisma.proactiveSuggestion.findFirst({ where: { id, tenantId } });
    return row ? toRecord(row) : null;
  }

  async countActive(tenantId: string): Promise<number> {
    const now = new Date();
    return prisma.proactiveSuggestion.count({
      where: {
        tenantId,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  async listByGoalId(tenantId: string, goalId: string, limit = 10): Promise<ProactiveSuggestionRecord[]> {
    const rows = await prisma.proactiveSuggestion.findMany({
      where: { tenantId, goalId, status: { in: ['active', 'snoozed'] } },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });
    return rows.map(toRecord);
  }
}
