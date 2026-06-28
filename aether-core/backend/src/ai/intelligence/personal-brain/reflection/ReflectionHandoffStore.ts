import crypto from 'crypto';
import { prisma } from '../../../../shared/prisma/client';
import type { HandoffPackage } from '../../multi-agent/types';

export interface PersistHandoffInput {
  tenantId: string;
  sourceAgentKey: string;
  targetAgentKey: string;
  reflectionIds: string[];
  summary: string;
  delegationId?: string;
  parentRunId?: string;
  childRunId?: string;
}

export class ReflectionHandoffStore {
  async persist(input: PersistHandoffInput): Promise<string> {
    const row = await prisma.reflectionHandoffLog.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        sourceAgentKey: input.sourceAgentKey,
        targetAgentKey: input.targetAgentKey,
        reflectionIds: input.reflectionIds,
        summary: input.summary,
        delegationId: input.delegationId ?? null,
        parentRunId: input.parentRunId ?? null,
        childRunId: input.childRunId ?? null,
      },
    });
    return row.id;
  }

  async listForTenant(
    tenantId: string,
    options?: { from?: Date; to?: Date; sourceAgentKey?: string; limit?: number }
  ) {
    const limit = options?.limit ?? 50;
    return prisma.reflectionHandoffLog.findMany({
      where: {
        tenantId,
        ...(options?.sourceAgentKey ? { sourceAgentKey: options.sourceAgentKey } : {}),
        ...(options?.from || options?.to
          ? {
              createdAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export function handoffPackageFromLog(row: {
  sourceAgentKey: string;
  targetAgentKey: string;
  reflectionIds: unknown;
  summary: string;
  delegationId: string | null;
}): HandoffPackage {
  const reflectionIds = Array.isArray(row.reflectionIds) ? row.reflectionIds.map(String) : [];
  return {
    sourceAgentKey: row.sourceAgentKey,
    targetAgentKey: row.targetAgentKey,
    reflectionIds,
    summary: row.summary,
    delegationId: row.delegationId ?? undefined,
  };
}
