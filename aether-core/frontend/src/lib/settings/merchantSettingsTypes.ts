export type AutonomyLevel = 'low' | 'medium' | 'high';
export type AutoRunWindow = 'always' | 'outside_office' | 'custom';
export type BrainActionMode = 'always_confirm' | 'confirm_on_uncertain' | 'adaptive';
export type BrainKnowledgeUpdateProfile = 'conservative' | 'balanced' | 'aggressive';
export type BrainKnowledgeGovernanceMode = 'contribute_only' | 'receive_only' | 'full_loop';
export type Locale = 'nl' | 'en';
export type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

export interface NotificationChannelPrefs {
  inApp: boolean;
  email: boolean;
}

export interface NotificationPrefs {
  autonomousLowRisk: NotificationChannelPrefs;
  highRiskApproval: NotificationChannelPrefs;
  supplierChanges: NotificationChannelPrefs;
  weeklyDigest: NotificationChannelPrefs;
  frequency: NotificationFrequency;
}

export interface MerchantSettings {
  autonomyLevel: AutonomyLevel;
  autoApproveLowRisk: boolean;
  autoApproveMediumRiskMail: boolean;
  maxAutoPriceChangePct: number;
  maxMarginImpactEuro: number;
  policyEnabled: boolean;
  autoRunWindow: AutoRunWindow;
  autoRunWindowStart: string | null;
  autoRunWindowEnd: string | null;
  notificationPrefs: NotificationPrefs;
  locale: Locale;
  dataExportEnabled: boolean;
  brainActionMode: BrainActionMode;
  brainKnowledgeTransferEnabled?: boolean | null;
  brainKnowledgeUpdateProfile: BrainKnowledgeUpdateProfile;
  brainFederatedContributionEnabled: boolean;
  brainKnowledgeGovernanceMode: BrainKnowledgeGovernanceMode;
  brainAdaptiveLearningEnabled: boolean;
  brainAdaptiveAutoExecuteEnabled: boolean;
  brainCrossTenantAgentPatternsEnabled: boolean;
  brainFederatedExecutionContribute: boolean;
  brainBilateralExchangeEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  autonomousLowRisk: { inApp: true, email: false },
  highRiskApproval: { inApp: true, email: true },
  supplierChanges: { inApp: true, email: false },
  weeklyDigest: { inApp: true, email: true },
  frequency: 'immediate',
};

export const DEFAULT_MERCHANT_SETTINGS: MerchantSettings = {
  autonomyLevel: 'medium',
  autoApproveLowRisk: true,
  autoApproveMediumRiskMail: false,
  maxAutoPriceChangePct: 5,
  maxMarginImpactEuro: 500,
  policyEnabled: true,
  autoRunWindow: 'always',
  autoRunWindowStart: '18:00',
  autoRunWindowEnd: '08:00',
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  locale: 'nl',
  dataExportEnabled: true,
  brainActionMode: 'confirm_on_uncertain',
  brainKnowledgeTransferEnabled: null,
  brainKnowledgeUpdateProfile: 'balanced',
  brainFederatedContributionEnabled: false,
  brainKnowledgeGovernanceMode: 'full_loop',
  brainAdaptiveLearningEnabled: false,
  brainAdaptiveAutoExecuteEnabled: false,
  brainCrossTenantAgentPatternsEnabled: false,
  brainFederatedExecutionContribute: false,
  brainBilateralExchangeEnabled: false,
};

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isAutonomousWindowOpen(
  settings: Pick<MerchantSettings, 'autoRunWindow' | 'autoRunWindowStart' | 'autoRunWindowEnd'>,
  now: Date = new Date(),
): boolean {
  if (settings.autoRunWindow === 'always') return true;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (settings.autoRunWindow === 'outside_office') {
    const officeStart = 9 * 60;
    const officeEnd = 18 * 60;
    return currentMinutes < officeStart || currentMinutes >= officeEnd;
  }

  const start = parseTimeToMinutes(settings.autoRunWindowStart) ?? 18 * 60;
  const end = parseTimeToMinutes(settings.autoRunWindowEnd) ?? 8 * 60;
  if (start === end) return true;
  if (start < end) return currentMinutes >= start && currentMinutes < end;
  return currentMinutes >= start || currentMinutes < end;
}

export function autoRunWindowLabel(settings: MerchantSettings): string {
  if (settings.autoRunWindow === 'always') return 'always';
  if (settings.autoRunWindow === 'outside_office') {
    return '09:00–18:00';
  }
  return `${settings.autoRunWindowStart ?? '18:00'}–${settings.autoRunWindowEnd ?? '08:00'}`;
}
