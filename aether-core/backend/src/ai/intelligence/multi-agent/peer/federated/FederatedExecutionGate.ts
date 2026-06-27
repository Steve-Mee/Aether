import { getMerchantSettings } from '../../../../../shared/settings/TenantSettingsService';

export function isFederatedExecutionEnabled(): boolean {
  if (process.env.BRAIN_FEDERATED_EXECUTION_ENABLED === 'false') return false;
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.BRAIN_FEDERATED_EXECUTION_ENABLED !== 'true'
  ) {
    return false;
  }
  return process.env.BRAIN_FEDERATED_EXECUTION_ENABLED === 'true';
}

export class FederatedExecutionGate {
  async isConsumerEnabled(tenantId: string): Promise<boolean> {
    if (!isFederatedExecutionEnabled()) return false;
    const settings = await getMerchantSettings(tenantId);
    return settings.brainCrossTenantAgentPatternsEnabled === true;
  }

  async isContributorEnabled(tenantId: string): Promise<boolean> {
    if (!isFederatedExecutionEnabled()) return false;
    const settings = await getMerchantSettings(tenantId);
    return (
      settings.brainCrossTenantAgentPatternsEnabled === true &&
      settings.brainFederatedExecutionContribute === true
    );
  }
}

export const FEDERATED_SANDBOX_PREFIX = 'federated-sandbox:';

export function parseFederatedSandboxKey(targetAgentKey: string): string | null {
  if (!targetAgentKey.startsWith(FEDERATED_SANDBOX_PREFIX)) return null;
  return targetAgentKey.slice(FEDERATED_SANDBOX_PREFIX.length);
}
