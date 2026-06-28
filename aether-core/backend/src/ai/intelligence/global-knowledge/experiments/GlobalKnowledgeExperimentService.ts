import { prisma } from '../../../../shared/prisma/client';
import type { UpdateProfile } from '../types';

function tenantBucket(tenantId: string): number {
  let hash = 0;
  for (let i = 0; i < tenantId.length; i++) {
    hash = (hash * 31 + tenantId.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

export class GlobalKnowledgeExperimentService {
  async resolveProfileOverride(
    tenantId: string,
    baseProfile: UpdateProfile
  ): Promise<{ profile: UpdateProfile; allowedPatchIds: Set<string> | null }> {
    const experiment = await prisma.globalKnowledgeExperiment.findFirst({
      where: { status: 'running', endAt: null },
      orderBy: { startAt: 'desc' },
    });
    if (!experiment) {
      return { profile: baseProfile, allowedPatchIds: null };
    }

    const bucket = tenantBucket(tenantId);
    if (bucket < experiment.bucketMin || bucket > experiment.bucketMax) {
      return { profile: baseProfile, allowedPatchIds: null };
    }

    const profileArm = experiment.profileArm as UpdateProfile;
    const profile =
      profileArm === 'conservative' || profileArm === 'aggressive' ? profileArm : baseProfile;

    const keys = experiment.patchSetKeys;
    const allowedPatchIds =
      Array.isArray(keys) && keys.length > 0 ? new Set(keys.map(String)) : null;

    return { profile, allowedPatchIds };
  }

  async recordOutcome(
    tenantId: string,
    metric: string,
    value: number
  ): Promise<void> {
    const experiment = await prisma.globalKnowledgeExperiment.findFirst({
      where: { status: 'running' },
    });
    if (!experiment) return;

    await prisma.globalKnowledgeExperimentOutcome.create({
      data: { experimentId: experiment.id, tenantId, metric, value },
    });
  }
}
