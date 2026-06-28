import { prisma } from '../../../shared/prisma/client';
import type {
  CreateGoalInput,
  GoalMetricScope,
  GoalProgressSnapshotRecord,
  GoalProgressSource,
  GoalPursuitMode,
  GoalStatus,
  MerchantGoalRecord,
  UpdateGoalInput,
} from './types';
import { GOAL_METRIC_DEFAULTS } from './types';
import { computeProgressPct } from './goalValidation';
import { GoalValidationError } from './goalValidation';

function parseMetricScope(raw: unknown): GoalMetricScope {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  return {
    categoryId: typeof obj.categoryId === 'string' ? obj.categoryId : undefined,
    threshold: typeof obj.threshold === 'number' ? obj.threshold : undefined,
    productSlug: typeof obj.productSlug === 'string' ? obj.productSlug : undefined,
  };
}

function toGoalRecord(row: {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  metricType: string;
  metricScope: unknown;
  targetValue: number;
  baselineValue: number;
  currentValue: number | null;
  unit: string;
  direction: string;
  deadline: Date;
  status: string;
  pursuitMode: string;
  parentGoalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  priorityWeight?: number | null;
}, progressPct: number | null = null): MerchantGoalRecord {
  const direction = row.direction as MerchantGoalRecord['direction'];
  const computedProgress =
    progressPct ??
    (row.currentValue != null
      ? computeProgressPct(row.currentValue, row.baselineValue, row.targetValue, direction)
      : null);
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    metricType: row.metricType as MerchantGoalRecord['metricType'],
    metricScope: parseMetricScope(row.metricScope),
    targetValue: row.targetValue,
    baselineValue: row.baselineValue,
    currentValue: row.currentValue,
    unit: row.unit as MerchantGoalRecord['unit'],
    direction: row.direction as MerchantGoalRecord['direction'],
    deadline: row.deadline,
    status: row.status as GoalStatus,
    pursuitMode: row.pursuitMode as GoalPursuitMode,
    parentGoalId: row.parentGoalId,
    progressPct: computedProgress,
    priorityWeight: row.priorityWeight ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

export class GoalRepository {
  async create(tenantId: string, input: CreateGoalInput, baselineValue: number): Promise<MerchantGoalRecord> {
    const defaults = GOAL_METRIC_DEFAULTS[input.metricType];
    const row = await prisma.merchantGoal.create({
      data: {
        tenantId,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        metricType: input.metricType,
        metricScope: input.metricScope ?? {},
        targetValue: input.targetValue,
        baselineValue,
        currentValue: baselineValue,
        unit: input.unit ?? defaults.unit,
        direction: input.direction ?? defaults.direction,
        deadline: new Date(input.deadline),
        pursuitMode: input.pursuitMode ?? 'balanced',
        parentGoalId: input.parentGoalId ?? null,
      },
    });
    return toGoalRecord(row, 0);
  }

  async findById(tenantId: string, id: string): Promise<MerchantGoalRecord | null> {
    const row = await prisma.merchantGoal.findFirst({ where: { id, tenantId } });
    if (!row) return null;
    return toGoalRecord(row);
  }

  async listByTenant(
    tenantId: string,
    opts?: { status?: GoalStatus[]; limit?: number; includeCompleted?: boolean }
  ): Promise<MerchantGoalRecord[]> {
    const statuses = opts?.status ?? (opts?.includeCompleted ? undefined : ['active', 'paused']);
    const rows = await prisma.merchantGoal.findMany({
      where: {
        tenantId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      take: opts?.limit ?? 50,
    });
    return rows.map((r) => toGoalRecord(r));
  }

  async countActive(tenantId: string): Promise<number> {
    return prisma.merchantGoal.count({ where: { tenantId, status: 'active' } });
  }

  async update(tenantId: string, id: string, patch: UpdateGoalInput): Promise<MerchantGoalRecord | null> {
    const existing = await prisma.merchantGoal.findFirst({ where: { id, tenantId } });
    if (!existing) return null;

    const data: Record<string, unknown> = {};
    if (patch.title !== undefined) data.title = patch.title.trim();
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.targetValue !== undefined) data.targetValue = patch.targetValue;
    if (patch.deadline !== undefined) data.deadline = new Date(patch.deadline);
    if (patch.status !== undefined) {
      data.status = patch.status;
      if (patch.status === 'completed') data.completedAt = new Date();
    }
    if (patch.pursuitMode !== undefined) data.pursuitMode = patch.pursuitMode;

    const row = await prisma.merchantGoal.update({ where: { id }, data });
    return toGoalRecord(row);
  }

  async updateProgress(
    tenantId: string,
    id: string,
    currentValue: number,
    progressPct: number,
    status?: GoalStatus
  ): Promise<void> {
    await prisma.merchantGoal.updateMany({
      where: { id, tenantId },
      data: {
        currentValue,
        ...(status ? { status, ...(status === 'completed' ? { completedAt: new Date() } : {}) } : {}),
      },
    });
  }

  async abandon(tenantId: string, id: string): Promise<boolean> {
    const result = await prisma.merchantGoal.updateMany({
      where: { id, tenantId, status: { not: 'completed' } },
      data: { status: 'abandoned' },
    });
    return result.count > 0;
  }

  async addSnapshot(
    tenantId: string,
    goalId: string,
    value: number,
    progressPct: number,
    source: GoalProgressSource
  ): Promise<GoalProgressSnapshotRecord> {
    const row = await prisma.goalProgressSnapshot.create({
      data: { tenantId, goalId, value, progressPct, source },
    });
    return {
      id: row.id,
      goalId: row.goalId,
      tenantId: row.tenantId,
      value: row.value,
      progressPct: row.progressPct,
      recordedAt: row.recordedAt,
      source: row.source as GoalProgressSource,
    };
  }

  async listSnapshots(tenantId: string, goalId: string, limit = 30): Promise<GoalProgressSnapshotRecord[]> {
    const rows = await prisma.goalProgressSnapshot.findMany({
      where: { tenantId, goalId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      goalId: r.goalId,
      tenantId: r.tenantId,
      value: r.value,
      progressPct: r.progressPct,
      recordedAt: r.recordedAt,
      source: r.source as GoalProgressSource,
    }));
  }

  async listActiveForProgress(tenantId: string): Promise<MerchantGoalRecord[]> {
    return this.listByTenant(tenantId, { status: ['active'] });
  }

  async listChildren(tenantId: string, parentGoalId: string): Promise<MerchantGoalRecord[]> {
    const rows = await prisma.merchantGoal.findMany({
      where: { tenantId, parentGoalId, status: { not: 'abandoned' } },
      orderBy: { deadline: 'asc' },
    });
    return rows.map((r) => toGoalRecord(r));
  }

  async validateParentGoal(tenantId: string, parentGoalId: string): Promise<void> {
    const parent = await prisma.merchantGoal.findFirst({
      where: { id: parentGoalId, tenantId },
    });
    if (!parent) {
      throw new GoalValidationError('Bovenliggend doel niet gevonden.');
    }
    if (parent.status !== 'active' && parent.status !== 'paused') {
      throw new GoalValidationError('Bovenliggend doel moet actief of gepauzeerd zijn.');
    }
    if (parent.parentGoalId) {
      throw new GoalValidationError('Maximale subdoel-diepte is 2.');
    }
  }

  buildGoalTree(flat: MerchantGoalRecord[]): MerchantGoalRecord[] {
    const byId = new Map(flat.map((g) => [g.id, { ...g, children: [] as MerchantGoalRecord[] }]));
    const roots: MerchantGoalRecord[] = [];
    for (const goal of byId.values()) {
      if (goal.parentGoalId && byId.has(goal.parentGoalId)) {
        byId.get(goal.parentGoalId)!.children!.push(goal);
      } else {
        roots.push(goal);
      }
    }
    for (const goal of byId.values()) {
      if (goal.children?.length) {
        const totalWeight = goal.children.reduce((sum, c) => sum + (c.progressPct ?? 0), 0);
        goal.progressPct = Math.round((totalWeight / goal.children.length) * 10) / 10;
      }
    }
    return roots;
  }
}
