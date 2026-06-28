import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';

export class AgentPatternContributionGate {
  async isEnabled(tenantId: string): Promise<boolean> {
    const settings = await getMerchantSettings(tenantId);
    return settings.brainCrossTenantAgentPatternsEnabled === true;
  }

  async isContributorEnabled(tenantId: string): Promise<boolean> {
    const settings = await getMerchantSettings(tenantId);
    if (settings.brainCrossTenantAgentPatternsEnabled !== true) return false;
    return settings.brainFederatedExecutionContribute === true;
  }
}
