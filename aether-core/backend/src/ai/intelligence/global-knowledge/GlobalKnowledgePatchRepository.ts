import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/prisma/client';
import type { KnowledgePatch, GlobalKnowledgePatchStatus, UpdateProfile, KnowledgePatchKind } from './types';

export interface CreatePatchInput {
  patchKey: string;
  kind: KnowledgePatchKind;
  category: string;
  title: string;
  content: string;
  priority?: number;
  minProfile?: UpdateProfile;
  tags?: string[];
  payload?: Record<string, unknown>;
  createdBy?: string;
}

export interface UpdatePatchInput {
  title?: string;
  content?: string;
  priority?: number;
  minProfile?: UpdateProfile;
  tags?: string[];
  payload?: Record<string, unknown>;
  version?: string;
}

function rowToPatch(row: {
  patchKey: string;
  version: string;
  kind: string;
  category: string;
  title: string;
  content: string;
  priority: number;
  minProfile: string;
  tags: unknown;
  payload: unknown;
}): KnowledgePatch {
  const minProfile: UpdateProfile =
    row.minProfile === 'conservative' || row.minProfile === 'aggressive'
      ? row.minProfile
      : 'balanced';
  const kind = row.kind as KnowledgePatch['kind'];
  const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
  const payload =
    row.payload && typeof row.payload === 'object'
      ? (row.payload as Record<string, unknown>)
      : undefined;
  return {
    id: row.patchKey,
    version: row.version,
    kind,
    category: row.category,
    title: row.title,
    content: row.content,
    priority: row.priority,
    minProfile,
    tags,
    payload,
  };
}

export class GlobalKnowledgePatchRepository {
  async listByStatus(status: GlobalKnowledgePatchStatus | GlobalKnowledgePatchStatus[]) {
    const statuses = Array.isArray(status) ? status : [status];
    return prisma.globalKnowledgePatch.findMany({
      where: { status: { in: statuses } },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async listActive(): Promise<KnowledgePatch[]> {
    const rows = await this.listByStatus('active');
    return rows.map(rowToPatch);
  }

  async listRetiredPatchKeys(): Promise<string[]> {
    const rows = await prisma.globalKnowledgePatch.findMany({
      where: { status: 'retired' },
      select: { patchKey: true },
    });
    return rows.map((r) => r.patchKey);
  }

  async findById(id: string) {
    return prisma.globalKnowledgePatch.findUnique({ where: { id } });
  }

  async findByPatchKey(patchKey: string) {
    return prisma.globalKnowledgePatch.findUnique({ where: { patchKey } });
  }

  async create(input: CreatePatchInput) {
    return prisma.globalKnowledgePatch.create({
      data: {
        patchKey: input.patchKey,
        kind: input.kind,
        category: input.category,
        title: input.title,
        content: input.content,
        priority: input.priority ?? 5,
        minProfile: input.minProfile ?? 'balanced',
        tags: input.tags ?? [],
        payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        createdBy: input.createdBy,
        status: 'draft',
      },
    });
  }

  async update(id: string, input: UpdatePatchInput) {
    return prisma.globalKnowledgePatch.update({
      where: { id },
      data: {
        title: input.title,
        content: input.content,
        priority: input.priority,
        minProfile: input.minProfile,
        tags: input.tags,
        payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        version: input.version,
      },
    });
  }

  async publish(id: string) {
    return prisma.globalKnowledgePatch.update({
      where: { id },
      data: { status: 'active', publishedAt: new Date(), retiredAt: null },
    });
  }

  async retire(id: string) {
    return prisma.globalKnowledgePatch.update({
      where: { id },
      data: { status: 'retired', retiredAt: new Date() },
    });
  }

  async getCatalogVersion(): Promise<string> {
    const latest = await prisma.globalKnowledgePatch.findFirst({
      where: { status: 'active' },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    const count = await prisma.globalKnowledgePatch.count({ where: { status: 'active' } });
    return latest ? `db:${count}:${latest.updatedAt.getTime()}` : 'db:0';
  }

  async logSync(input: {
    tenantId: string;
    catalogVersion: string;
    appliedCount: number;
    retiredCount: number;
    profile: string;
  }) {
    return prisma.globalKnowledgeSyncLog.create({ data: input });
  }

  async getLatestSyncLog(tenantId: string) {
    return prisma.globalKnowledgeSyncLog.findFirst({
      where: { tenantId },
      orderBy: { syncedAt: 'desc' },
    });
  }

  async listSyncHistory(tenantId: string, limit = 20) {
    return prisma.globalKnowledgeSyncLog.findMany({
      where: { tenantId },
      orderBy: { syncedAt: 'desc' },
      take: limit,
    });
  }
}
