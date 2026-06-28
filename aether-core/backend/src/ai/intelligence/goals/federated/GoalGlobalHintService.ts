import { prisma } from '../../../../shared/prisma/client';
import { buildGoalPatternKey } from './GoalPatternDistillationService';
import type { GoalMetricType } from '../types';

export class GoalGlobalHintService {
  async getCompletionHint(
    metricType: GoalMetricType,
    pursuitMode: string
  ): Promise<string | null> {
    const patternKey = buildGoalPatternKey(metricType, pursuitMode, 'completed');
    const pattern = await prisma.globalGoalPattern.findUnique({ where: { patternKey } });
    if (!pattern?.kAnonymityMet || !pattern.avgDaysToComplete) return null;
    const days = Math.round(pattern.avgDaysToComplete);
    return `Merchants met vergelijkbare ${metricType}-doelen halen dit gemiddeld in ${days} dagen.`;
  }

  async getRealisticTargetFactor(metricType: GoalMetricType): Promise<number | null> {
    const pattern = await prisma.globalGoalPattern.findFirst({
      where: { metricType, kAnonymityMet: true },
      orderBy: { sampleSize: 'desc' },
    });
    if (!pattern || pattern.completionRate < 0.5) return null;
    return 0.85;
  }
}
