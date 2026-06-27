import crypto from 'crypto';
import { prisma } from '../../../../shared/prisma/client';
import { isKnowledgeTransferEnabledEnv } from '../isKnowledgeTransferEnabled';

const CONTRIBUTE_MODES = new Set(['full_loop', 'contribute_only']);

export function metricFingerprint(category: string, metric: string): string {
  return crypto.createHash('sha256').update(`${category}:${metric}`).digest('hex').slice(0, 16);
}

export async function findEligibleContributionTenants(): Promise<string[]> {
  if (!isKnowledgeTransferEnabledEnv()) return [];

  const rows = await prisma.tenantSettings.findMany({
    where: {
      OR: [{ brainKnowledgeTransferEnabled: null }, { brainKnowledgeTransferEnabled: true }],
      brainKnowledgeGovernanceMode: { in: ['full_loop', 'contribute_only'] },
    },
    select: { tenantId: true, brainKnowledgeGovernanceMode: true, brainKnowledgeTransferEnabled: true },
  });

  return rows
    .filter((r) => {
      if (r.brainKnowledgeTransferEnabled === false) return false;
      const mode = r.brainKnowledgeGovernanceMode ?? 'full_loop';
      return CONTRIBUTE_MODES.has(mode);
    })
    .map((r) => r.tenantId);
}
