import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';

export class AgentPatternContributionGate {
  async isEnabled(tenantId: string): Promise<boolean> {
    const settings = await getMerchantSettings(tenantId);
    return settings.brainCrossTenantAgentPatternsEnabled === true;
  }
}
