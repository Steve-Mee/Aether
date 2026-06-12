import {
  getMerchantSettings,
  updateMerchantSettings,
} from '../settings/TenantSettingsService';

export interface TenantApprovalPolicy {
  autoApproveLowRisk: boolean;
  autoApproveMediumRiskMail: boolean;
  maxAutoPriceChangePct: number;
  enabled: boolean;
}

export async function getTenantApprovalPolicy(tenantId: string): Promise<TenantApprovalPolicy> {
  const settings = await getMerchantSettings(tenantId);
  return {
    autoApproveLowRisk: settings.autoApproveLowRisk,
    autoApproveMediumRiskMail: settings.autoApproveMediumRiskMail,
    maxAutoPriceChangePct: settings.maxAutoPriceChangePct,
    enabled: settings.policyEnabled,
  };
}

export async function setTenantApprovalPolicy(
  tenantId: string,
  patch: Partial<TenantApprovalPolicy>
): Promise<TenantApprovalPolicy> {
  const settingsPatch: Parameters<typeof updateMerchantSettings>[1] = {};
  if (patch.autoApproveLowRisk !== undefined) settingsPatch.autoApproveLowRisk = patch.autoApproveLowRisk;
  if (patch.autoApproveMediumRiskMail !== undefined) {
    settingsPatch.autoApproveMediumRiskMail = patch.autoApproveMediumRiskMail;
  }
  if (patch.maxAutoPriceChangePct !== undefined) {
    settingsPatch.maxAutoPriceChangePct = patch.maxAutoPriceChangePct;
  }
  if (patch.enabled !== undefined) settingsPatch.policyEnabled = patch.enabled;

  const settings = await updateMerchantSettings(tenantId, settingsPatch);
  return {
    autoApproveLowRisk: settings.autoApproveLowRisk,
    autoApproveMediumRiskMail: settings.autoApproveMediumRiskMail,
    maxAutoPriceChangePct: settings.maxAutoPriceChangePct,
    enabled: settings.policyEnabled,
  };
}

export { assessApprovalAutoEligible } from './assessApprovalAutoEligible';
