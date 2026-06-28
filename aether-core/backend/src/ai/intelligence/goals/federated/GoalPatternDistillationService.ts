import { createHash } from 'crypto';
import { prisma } from '../../../../shared/prisma/client';
import { meetsKAnonymity } from '../../global-knowledge/federated/privacyUtils';
import type { MerchantGoalRecord } from '../types';

export function buildGoalPatternKey(
  metricType: string,
  pursuitMode: string | null,
  outcome: 'completed' | 'drift_recovery'
): string {
  const raw = `${metricType}|${pursuitMode ?? 'balanced'}|${outcome}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export class GoalPatternDistillationService {
  async contributeCompletion(tenantId: string, goal: MerchantGoalRecord): Promise<void> {
    const patternKey = buildGoalPatternKey(goal.metricType, goal.pursuitMode, 'completed');
    const daysToComplete =
      goal.completedAt && goal.createdAt
        ? (goal.completedAt.getTime() - goal.createdAt.getTime()) / 86_400_000
        : null;

    await prisma.goalPatternContribution.upsert({
      where: { tenantId_patternKey: { tenantId, patternKey } },
      create: { tenantId, patternKey, sampleCount: 1 },
      update: { sampleCount: { increment: 1 } },
    });

    const contributions = await prisma.goalPatternContribution.findMany({
      where: { patternKey },
    });
    const tenantCount = new Set(contributions.map((c) => c.tenantId)).size;
    const sampleSize = contributions.reduce((sum, c) => sum + c.sampleCount, 0);
    const kMet = meetsKAnonymity(tenantCount, sampleSize);

    await prisma.globalGoalPattern.upsert({
      where: { patternKey },
      create: {
        patternKey,
        metricType: goal.metricType,
        pursuitMode: goal.pursuitMode,
        completionRate: 1,
        avgDaysToComplete: daysToComplete,
        tenantCount,
        sampleSize,
        kAnonymityMet: kMet,
      },
      update: {
        completionRate: 1,
        avgDaysToComplete: daysToComplete,
        tenantCount,
        sampleSize,
        kAnonymityMet: kMet,
      },
    });
  }

  async contributeDriftRecovery(tenantId: string, goal: MerchantGoalRecord): Promise<void> {
    const patternKey = buildGoalPatternKey(goal.metricType, goal.pursuitMode, 'drift_recovery');
    await prisma.goalPatternContribution.upsert({
      where: { tenantId_patternKey: { tenantId, patternKey } },
      create: { tenantId, patternKey, sampleCount: 1 },
      update: { sampleCount: { increment: 1 } },
    });

    const contributions = await prisma.goalPatternContribution.findMany({ where: { patternKey } });
    const tenantCount = new Set(contributions.map((c) => c.tenantId)).size;
    const sampleSize = contributions.reduce((sum, c) => sum + c.sampleCount, 0);

    await prisma.globalGoalPattern.upsert({
      where: { patternKey },
      create: {
        patternKey,
        metricType: goal.metricType,
        pursuitMode: goal.pursuitMode,
        completionRate: 0,
        driftRecoveryRate: 1,
        tenantCount,
        sampleSize,
        kAnonymityMet: meetsKAnonymity(tenantCount, sampleSize),
      },
      update: {
        driftRecoveryRate: 1,
        tenantCount,
        sampleSize,
        kAnonymityMet: meetsKAnonymity(tenantCount, sampleSize),
      },
    });
  }
}
