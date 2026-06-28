import { prisma } from '../../../shared/prisma/client';

export function isKnowledgeTransferEnabledEnv(): boolean {
  return process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED === 'true';
}

/** Env default, with optional per-tenant opt-out via TenantSettings. */
export async function isKnowledgeTransferEnabledForTenant(tenantId: string): Promise<boolean> {
  if (!isKnowledgeTransferEnabledEnv()) return false;
  const row = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { brainKnowledgeTransferEnabled: true },
  });
  if (row?.brainKnowledgeTransferEnabled === false) return false;
  return true;
}
