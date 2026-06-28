import { prisma } from '../../../shared/prisma/client';
import { logger } from '../../../shared/logging/logger';
import type {
  ExplainabilityPayload,
  ExplainabilityPersistLevel,
  ExplainabilitySourceType,
  ExplainabilitySummarySource,
  FlowGraph,
} from './types';
import type { Prisma } from '@prisma/client';
import { explainabilityPatternDistillJob } from './jobs/ExplainabilityPatternDistillJob';

export interface SaveExplainabilityInput {
  tenantId: string;
  sourceType: ExplainabilitySourceType;
  sourceId: string;
  rootRunId?: string;
  persistLevel: ExplainabilityPersistLevel;
  payload: ExplainabilityPayload;
  summarySource?: ExplainabilitySummarySource;
  agentKeys?: string[];
  intentId?: string;
  triggerId?: string;
  flowGraph?: FlowGraph;
  enqueueLlm?: boolean;
  goalId?: string;
}

export class ExplainabilityPersister {
  async save(input: SaveExplainabilityInput): Promise<string | undefined> {
    try {
      const agentKeys =
        input.agentKeys ?? input.payload.agents.map((a) => a.agentKey);
      const flowGraph = input.flowGraph ?? input.payload.flowGraph;

      const row = await prisma.agentExplainabilitySnapshot.upsert({
        where: {
          tenantId_sourceType_sourceId: {
            tenantId: input.tenantId,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
          },
        },
        create: {
          tenantId: input.tenantId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          rootRunId: input.rootRunId,
          detailLevel: input.persistLevel,
          summary: input.payload.summary,
          summarySource: input.summarySource ?? 'template',
          agentKeys,
          intentId: input.intentId ?? null,
          triggerId: input.triggerId ?? null,
          flowGraph: flowGraph ? (flowGraph as unknown as Prisma.InputJsonValue) : undefined,
          payload: input.payload as unknown as Prisma.InputJsonValue,
        },
        update: {
          rootRunId: input.rootRunId,
          detailLevel: input.persistLevel,
          summary: input.payload.summary,
          summarySource: input.summarySource ?? 'template',
          agentKeys,
          intentId: input.intentId ?? null,
          triggerId: input.triggerId ?? null,
          flowGraph: flowGraph ? (flowGraph as unknown as Prisma.InputJsonValue) : undefined,
          payload: input.payload as unknown as Prisma.InputJsonValue,
        },
      });

      if (input.enqueueLlm) {
        await this.markPendingLlm(input.tenantId, input.sourceType, input.sourceId);
      }

      void explainabilityPatternDistillJob.distillSnapshot({
        tenantId: input.tenantId,
        sourceType: input.sourceType,
        agentKeys,
        triggerId: input.triggerId,
        intentId: input.intentId,
        summary: input.payload.summary,
      });

      return row.id;
    } catch (err) {
      logger.warn('explainability_persist_failed', {
        tenantId: input.tenantId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        error: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    }
  }

  async markPendingLlm(
    tenantId: string,
    sourceType: ExplainabilitySourceType,
    sourceId: string
  ): Promise<void> {
    await prisma.agentExplainabilitySnapshot.updateMany({
      where: { tenantId, sourceType, sourceId, summarySource: 'template' },
      data: { summarySource: 'template' },
    });
  }

  async updateLlmSummary(
    tenantId: string,
    sourceType: ExplainabilitySourceType,
    sourceId: string,
    summary: string,
    payload: ExplainabilityPayload
  ): Promise<void> {
    await prisma.agentExplainabilitySnapshot.update({
      where: {
        tenantId_sourceType_sourceId: { tenantId, sourceType, sourceId },
      },
      data: {
        summary,
        summarySource: 'llm',
        llmSummaryAt: new Date(),
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listPendingLlm(limit = 20) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return prisma.agentExplainabilitySnapshot.findMany({
      where: {
        summarySource: 'template',
        createdAt: { gte: since },
        detailLevel: { not: 'minimal' },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async listForSimilarity(
    tenantId: string,
    excludeSourceId: string,
    since: Date,
    limit = 50
  ) {
    return prisma.agentExplainabilitySnapshot.findMany({
      where: {
        tenantId,
        sourceId: { not: excludeSourceId },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async listForAuditExport(tenantId: string, since: Date, until: Date) {
    return prisma.agentExplainabilitySnapshot.findMany({
      where: {
        tenantId,
        createdAt: { gte: since, lte: until },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async hasSnapshot(
    tenantId: string,
    sourceType: ExplainabilitySourceType,
    sourceId: string
  ): Promise<boolean> {
    const row = await prisma.agentExplainabilitySnapshot.findUnique({
      where: {
        tenantId_sourceType_sourceId: { tenantId, sourceType, sourceId },
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async getSnapshot(
    tenantId: string,
    sourceType: ExplainabilitySourceType,
    sourceId: string
  ) {
    return prisma.agentExplainabilitySnapshot.findUnique({
      where: {
        tenantId_sourceType_sourceId: { tenantId, sourceType, sourceId },
      },
    });
  }

  async listSourceIdsWithSnapshots(
    tenantId: string,
    sourceType: ExplainabilitySourceType,
    sourceIds: string[]
  ): Promise<Set<string>> {
    if (sourceIds.length === 0) return new Set();
    const rows = await prisma.agentExplainabilitySnapshot.findMany({
      where: {
        tenantId,
        sourceType,
        sourceId: { in: sourceIds },
      },
      select: { sourceId: true },
    });
    return new Set(rows.map((r) => r.sourceId));
  }
}

export const explainabilityPersister = new ExplainabilityPersister();
