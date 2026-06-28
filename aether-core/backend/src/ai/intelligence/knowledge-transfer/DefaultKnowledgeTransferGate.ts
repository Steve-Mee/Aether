import { isKnowledgeTransferEnabledForTenant } from './isKnowledgeTransferEnabled';
import type { KnowledgeTransferGatePort } from './KnowledgeTransferGatePort';

export class DefaultKnowledgeTransferGate implements KnowledgeTransferGatePort {
  async isEnabled(tenantId: string): Promise<boolean> {
    return isKnowledgeTransferEnabledForTenant(tenantId);
  }
}
