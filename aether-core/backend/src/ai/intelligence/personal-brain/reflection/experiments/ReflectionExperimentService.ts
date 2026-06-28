import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/prisma/client';
import type {
  ReflectionVariantConfig,
  ResolvedReflectionExperiment,
} from './types';
import { DEFAULT_REFLECTION_VARIANT } from './types';

function tenantBucket(tenantId: string): number {
  let hash = 0;
  for (let i = 0; i < tenantId.length; i++) {
    hash = (hash * 31 + tenantId.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

function parseVariantConfig(raw: unknown): ReflectionVariantConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_REFLECTION_VARIANT };
  const obj = raw as Record<string, unknown>;
  return {
    adaptiveHints: obj.adaptiveHints !== false,
    failureTrigger: obj.failureTrigger !== false,
    highImpactTrigger: obj.highImpactTrigger !== false,
    multiStepTrigger: obj.multiStepTrigger !== false,
    distillationEnabled: obj.distillationEnabled !== false,
    minTools: typeof obj.minTools === 'number' ? obj.minTools : undefined,
  };
}

export class ReflectionExperimentService {
  async resolveConfig(tenantId: string): Promise<ResolvedReflectionExperiment> {
    const experiment = await prisma.reflectionExperiment.findFirst({
      where: { status: 'running', endAt: null },
      orderBy: { startAt: 'desc' },
    });

    if (!experiment) {
      return {
        experimentId: null,
        variantArm: 'control',
        config: { ...DEFAULT_REFLECTION_VARIANT },
      };
    }

    const bucket = tenantBucket(tenantId);
    const inBucket = bucket >= experiment.bucketMin && bucket <= experiment.bucketMax;
    if (!inBucket) {
      return {
        experimentId: experiment.id,
        variantArm: 'control',
        config: { ...DEFAULT_REFLECTION_VARIANT },
      };
    }

    const treatment = parseVariantConfig(experiment.variantConfig);
    return {
      experimentId: experiment.id,
      variantArm: 'treatment',
      config: { ...DEFAULT_REFLECTION_VARIANT, ...treatment },
    };
  }

  async recordOutcome(params: {
    tenantId: string;
    metric: string;
    value: number;
    runId?: string;
    variantArm?: string;
  }): Promise<void> {
    const experiment = await prisma.reflectionExperiment.findFirst({
      where: { status: 'running', endAt: null },
    });
    if (!experiment) return;

    if (params.runId) {
      const existing = await prisma.reflectionExperimentOutcome.findFirst({
        where: {
          experimentId: experiment.id,
          tenantId: params.tenantId,
          runId: params.runId,
          metric: params.metric,
        },
      });
      if (existing) return;
    }

    await prisma.reflectionExperimentOutcome.create({
      data: {
        experimentId: experiment.id,
        tenantId: params.tenantId,
        runId: params.runId ?? null,
        metric: params.metric,
        value: params.value,
        variantArm: params.variantArm ?? 'control',
      },
    });
  }

  async listExperiments() {
    return prisma.reflectionExperiment.findMany({ orderBy: { startAt: 'desc' } });
  }

  async createExperiment(params: {
    name: string;
    bucketMin?: number;
    bucketMax?: number;
    variantConfig: ReflectionVariantConfig;
  }) {
    return prisma.reflectionExperiment.create({
      data: {
        name: params.name,
        bucketMin: params.bucketMin ?? 0,
        bucketMax: params.bucketMax ?? 49,
        variantConfig: params.variantConfig as Prisma.InputJsonValue,
        status: 'running',
      },
    });
  }

  async stopExperiment(id: string) {
    return prisma.reflectionExperiment.update({
      where: { id },
      data: { status: 'stopped', endAt: new Date() },
    });
  }

  async getOutcomesAggregated(experimentId: string) {
    const outcomes = await prisma.reflectionExperimentOutcome.findMany({
      where: { experimentId },
    });
    const byArmMetric = new Map<string, { sum: number; count: number }>();
    for (const o of outcomes) {
      const key = `${o.variantArm}:${o.metric}`;
      const prev = byArmMetric.get(key) ?? { sum: 0, count: 0 };
      byArmMetric.set(key, { sum: prev.sum + o.value, count: prev.count + 1 });
    }
    return [...byArmMetric.entries()].map(([key, stats]) => {
      const [variantArm, metric] = key.split(':');
      return {
        variantArm,
        metric,
        avg: stats.count > 0 ? stats.sum / stats.count : 0,
        count: stats.count,
      };
    });
  }
}

export { tenantBucket };
