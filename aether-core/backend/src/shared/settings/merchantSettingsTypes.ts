export type AutonomyLevel = 'low' | 'medium' | 'high';
export type AutoRunWindow = 'always' | 'outside_office' | 'custom';
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

export type BrainVectorBackend = 'pgvector' | 'lancedb' | 'memory';
export type BrainActionMode = 'always_confirm' | 'confirm_on_uncertain' | 'adaptive';
export type BrainKnowledgeUpdateProfile = 'conservative' | 'balanced' | 'aggressive';
export type BrainKnowledgeGovernanceMode = 'contribute_only' | 'receive_only' | 'full_loop';

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
  brainVectorBackend: BrainVectorBackend | null;
  brainKnowledgeTransferEnabled: boolean | null;
  brainKnowledgeUpdateProfile: BrainKnowledgeUpdateProfile;
  brainFederatedContributionEnabled: boolean;
  brainKnowledgeGovernanceMode: BrainKnowledgeGovernanceMode;
  brainLoRAPath: string | null;
  brainActionMode: BrainActionMode;
  brainAdaptiveLearningEnabled: boolean;
  brainAdaptiveAutoExecuteEnabled: boolean;
  brainCrossTenantAgentPatternsEnabled: boolean;
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
  brainVectorBackend: null,
  brainKnowledgeTransferEnabled: null,
  brainKnowledgeUpdateProfile: 'balanced',
  brainFederatedContributionEnabled: false,
  brainKnowledgeGovernanceMode: 'full_loop',
  brainLoRAPath: null,
  brainActionMode: 'confirm_on_uncertain',
  brainAdaptiveLearningEnabled: false,
  brainAdaptiveAutoExecuteEnabled: false,
  brainCrossTenantAgentPatternsEnabled: false,
};

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  const obj = raw as Record<string, unknown>;
  const channel = (key: keyof Omit<NotificationPrefs, 'frequency'>, fallback: NotificationChannelPrefs) => {
    const val = obj[key];
    if (!val || typeof val !== 'object') return { ...fallback };
    const c = val as Record<string, unknown>;
    return {
      inApp: c.inApp !== false,
      email: c.email === true,
    };
  };
  const freq = obj.frequency;
  const frequency: NotificationFrequency =
    freq === 'daily' || freq === 'weekly' ? freq : 'immediate';
  return {
    autonomousLowRisk: channel('autonomousLowRisk', DEFAULT_NOTIFICATION_PREFS.autonomousLowRisk),
    highRiskApproval: channel('highRiskApproval', DEFAULT_NOTIFICATION_PREFS.highRiskApproval),
    supplierChanges: channel('supplierChanges', DEFAULT_NOTIFICATION_PREFS.supplierChanges),
    weeklyDigest: channel('weeklyDigest', DEFAULT_NOTIFICATION_PREFS.weeklyDigest),
    frequency,
  };
}

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Returns true when autonomous actions are allowed at the given time. */
export function isAutonomousWindowOpen(
  settings: Pick<MerchantSettings, 'autoRunWindow' | 'autoRunWindowStart' | 'autoRunWindowEnd'>,
  now: Date = new Date()
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
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
}

export function extractMarginImpact(payload: Record<string, unknown>): number {
  const raw =
    payload.estimatedImpactEuro ??
    payload.marginImpact ??
    payload.impactEuro ??
    payload.amount ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}
