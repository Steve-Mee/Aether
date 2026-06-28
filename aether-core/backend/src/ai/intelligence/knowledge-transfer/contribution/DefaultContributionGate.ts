import { prisma } from '../../../../shared/prisma/client';
import { isKnowledgeTransferEnabledEnv } from '../isKnowledgeTransferEnabled';
import type { ContributionGatePort } from './ContributionGatePort';

const CONTRIBUTE_MODES = new Set(['full_loop', 'contribute_only']);

export class DefaultContributionGate implements ContributionGatePort {
  async canContribute(tenantId: string): Promise<boolean> {
    if (!isKnowledgeTransferEnabledEnv()) return false;

    const row = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        brainKnowledgeTransferEnabled: true,
        brainKnowledgeGovernanceMode: true,
      },
    });

    if (row?.brainKnowledgeTransferEnabled === false) return false;

    const mode = row?.brainKnowledgeGovernanceMode ?? 'full_loop';
    return CONTRIBUTE_MODES.has(mode);
  }

  async shouldFederate(tenantId: string): Promise<boolean> {
    if (!(await this.canContribute(tenantId))) return false;

    const row = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { brainFederatedContributionEnabled: true },
    });

    return row?.brainFederatedContributionEnabled === true;
  }
}
