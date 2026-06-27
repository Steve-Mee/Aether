import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import {
  DEFAULT_MERCHANT_SETTINGS,
  parseNotificationPrefs,
  type NotificationPrefs,
  type AutonomyLevel,
  type AutoRunWindow,
  type Locale,
  type MerchantSettings,
} from './merchantSettingsTypes';

function toJsonPrefs(prefs: NotificationPrefs): Prisma.InputJsonValue {
  return prefs as unknown as Prisma.InputJsonValue;
}

function rowToSettings(row: {
  autonomyLevel: string;
  autoApproveLowRisk: boolean;
  autoApproveMediumRiskMail: boolean;
  maxAutoPriceChangePct: number;
  maxMarginImpactEuro: number;
  policyEnabled: boolean;
  autoRunWindow: string;
  autoRunWindowStart: string | null;
  autoRunWindowEnd: string | null;
  notificationPrefs: unknown;
  locale: string;
  dataExportEnabled: boolean;
  brainVectorBackend: string | null;
  brainKnowledgeTransferEnabled: boolean | null;
  brainKnowledgeUpdateProfile?: string;
  brainFederatedContributionEnabled?: boolean;
  brainKnowledgeGovernanceMode?: string;
  brainLoRAPath: string | null;
  brainActionMode: string;
  brainAdaptiveLearningEnabled: boolean;
  brainAdaptiveAutoExecuteEnabled: boolean;
  brainCrossTenantAgentPatternsEnabled?: boolean;
}): MerchantSettings {
  const level = row.autonomyLevel;
  const autonomyLevel: AutonomyLevel =
    level === 'low' || level === 'high' ? level : 'medium';
  const window = row.autoRunWindow;
  const autoRunWindow: AutoRunWindow =
    window === 'outside_office' || window === 'custom' ? window : 'always';
  const locale: Locale = row.locale === 'en' ? 'en' : 'nl';
  const brainBackend = row.brainVectorBackend;
  const brainVectorBackend: MerchantSettings['brainVectorBackend'] =
    brainBackend === 'pgvector' || brainBackend === 'lancedb' || brainBackend === 'memory'
      ? brainBackend
      : null;
  const actionMode = row.brainActionMode;
  const brainActionMode: MerchantSettings['brainActionMode'] =
    actionMode === 'always_confirm' || actionMode === 'adaptive'
      ? actionMode
      : 'confirm_on_uncertain';
  const updateProfile = row.brainKnowledgeUpdateProfile ?? 'balanced';
  const brainKnowledgeUpdateProfile: MerchantSettings['brainKnowledgeUpdateProfile'] =
    updateProfile === 'conservative' || updateProfile === 'aggressive'
      ? updateProfile
      : 'balanced';
  const governanceMode = row.brainKnowledgeGovernanceMode;
  const brainKnowledgeGovernanceMode: MerchantSettings['brainKnowledgeGovernanceMode'] =
    governanceMode === 'contribute_only' || governanceMode === 'receive_only'
      ? governanceMode
      : 'full_loop';

  return {
    autonomyLevel,
    autoApproveLowRisk: row.autoApproveLowRisk,
    autoApproveMediumRiskMail: row.autoApproveMediumRiskMail,
    maxAutoPriceChangePct: row.maxAutoPriceChangePct,
    maxMarginImpactEuro: row.maxMarginImpactEuro,
    policyEnabled: row.policyEnabled,
    autoRunWindow,
    autoRunWindowStart: row.autoRunWindowStart,
    autoRunWindowEnd: row.autoRunWindowEnd,
    notificationPrefs: parseNotificationPrefs(row.notificationPrefs),
    locale,
    dataExportEnabled: row.dataExportEnabled,
    brainVectorBackend,
    brainKnowledgeTransferEnabled: row.brainKnowledgeTransferEnabled,
    brainKnowledgeUpdateProfile,
    brainFederatedContributionEnabled: row.brainFederatedContributionEnabled ?? false,
    brainKnowledgeGovernanceMode,
    brainLoRAPath: row.brainLoRAPath,
    brainActionMode,
    brainAdaptiveLearningEnabled: row.brainAdaptiveLearningEnabled,
    brainAdaptiveAutoExecuteEnabled: row.brainAdaptiveAutoExecuteEnabled,
    brainCrossTenantAgentPatternsEnabled: row.brainCrossTenantAgentPatternsEnabled ?? false,
  };
}

export async function getMerchantSettings(tenantId: string): Promise<MerchantSettings> {
  const row = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  if (!row) {
    return { ...DEFAULT_MERCHANT_SETTINGS, notificationPrefs: { ...DEFAULT_MERCHANT_SETTINGS.notificationPrefs } };
  }
  return rowToSettings(row);
}

export async function ensureMerchantSettings(tenantId: string): Promise<MerchantSettings> {
  const row = await prisma.tenantSettings.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      notificationPrefs: toJsonPrefs(DEFAULT_MERCHANT_SETTINGS.notificationPrefs),
    },
  });
  return rowToSettings(row);
}

export async function updateMerchantSettings(
  tenantId: string,
  patch: Partial<MerchantSettings>
): Promise<MerchantSettings> {
  await ensureMerchantSettings(tenantId);

  const data: Record<string, unknown> = {};
  if (patch.autonomyLevel !== undefined) data.autonomyLevel = patch.autonomyLevel;
  if (patch.autoApproveLowRisk !== undefined) data.autoApproveLowRisk = patch.autoApproveLowRisk;
  if (patch.autoApproveMediumRiskMail !== undefined) {
    data.autoApproveMediumRiskMail = patch.autoApproveMediumRiskMail;
  }
  if (patch.maxAutoPriceChangePct !== undefined) {
    data.maxAutoPriceChangePct = patch.maxAutoPriceChangePct;
  }
  if (patch.maxMarginImpactEuro !== undefined) data.maxMarginImpactEuro = patch.maxMarginImpactEuro;
  if (patch.policyEnabled !== undefined) data.policyEnabled = patch.policyEnabled;
  if (patch.autoRunWindow !== undefined) data.autoRunWindow = patch.autoRunWindow;
  if (patch.autoRunWindowStart !== undefined) data.autoRunWindowStart = patch.autoRunWindowStart;
  if (patch.autoRunWindowEnd !== undefined) data.autoRunWindowEnd = patch.autoRunWindowEnd;
  if (patch.notificationPrefs !== undefined) {
    const current = await getMerchantSettings(tenantId);
    data.notificationPrefs = toJsonPrefs({
      ...current.notificationPrefs,
      ...patch.notificationPrefs,
      autonomousLowRisk: {
        ...current.notificationPrefs.autonomousLowRisk,
        ...(patch.notificationPrefs.autonomousLowRisk ?? {}),
      },
      highRiskApproval: {
        ...current.notificationPrefs.highRiskApproval,
        ...(patch.notificationPrefs.highRiskApproval ?? {}),
      },
      supplierChanges: {
        ...current.notificationPrefs.supplierChanges,
        ...(patch.notificationPrefs.supplierChanges ?? {}),
      },
      weeklyDigest: {
        ...current.notificationPrefs.weeklyDigest,
        ...(patch.notificationPrefs.weeklyDigest ?? {}),
      },
    });
  }
  if (patch.locale !== undefined) data.locale = patch.locale;
  if (patch.dataExportEnabled !== undefined) data.dataExportEnabled = patch.dataExportEnabled;
  if (patch.brainVectorBackend !== undefined) data.brainVectorBackend = patch.brainVectorBackend;
  if (patch.brainKnowledgeTransferEnabled !== undefined) {
    data.brainKnowledgeTransferEnabled = patch.brainKnowledgeTransferEnabled;
  }
  if (patch.brainKnowledgeUpdateProfile !== undefined) {
    data.brainKnowledgeUpdateProfile = patch.brainKnowledgeUpdateProfile;
  }
  if (patch.brainFederatedContributionEnabled !== undefined) {
    data.brainFederatedContributionEnabled = patch.brainFederatedContributionEnabled;
  }
  if (patch.brainKnowledgeGovernanceMode !== undefined) {
    data.brainKnowledgeGovernanceMode = patch.brainKnowledgeGovernanceMode;
  }
  if (patch.brainLoRAPath !== undefined) data.brainLoRAPath = patch.brainLoRAPath;
  if (patch.brainActionMode !== undefined) data.brainActionMode = patch.brainActionMode;
  if (patch.brainAdaptiveLearningEnabled !== undefined) {
    data.brainAdaptiveLearningEnabled = patch.brainAdaptiveLearningEnabled;
  }
  if (patch.brainAdaptiveAutoExecuteEnabled !== undefined) {
    data.brainAdaptiveAutoExecuteEnabled = patch.brainAdaptiveAutoExecuteEnabled;
  }

  const row = await prisma.tenantSettings.update({
    where: { tenantId },
    data,
  });
  return rowToSettings(row);
}

export interface ConnectedServiceDto {
  id: string;
  name: string;
  type: 'email' | 'supplier' | 'payment';
  status: 'connected' | 'disconnected' | 'error' | 'demo';
  lastSyncAt: string | null;
  detail?: string;
}

export async function listConnectedServices(tenantId: string): Promise<ConnectedServiceDto[]> {
  const [mailboxes, suppliers, latestChange] = await Promise.all([
    prisma.mailbox.findMany({
      where: { tenantId },
      select: { id: true, email: true, lastPolledAt: true },
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      select: { id: true, name: true, autoSyncEnabled: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplierChange.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  const services: ConnectedServiceDto[] = [];

  if (mailboxes.length === 0) {
    services.push({
      id: 'mail-demo',
      name: 'AETHER Mail',
      type: 'email',
      status: 'demo',
      lastSyncAt: null,
      detail: 'Nog geen mailbox gekoppeld',
    });
  } else {
    for (const mb of mailboxes) {
      services.push({
        id: mb.id,
        name: `AETHER Mail — ${mb.email}`,
        type: 'email',
        status: 'connected',
        lastSyncAt: mb.lastPolledAt?.toISOString() ?? null,
      });
    }
  }

  if (suppliers.length === 0) {
    services.push({
      id: 'supplier-demo',
      name: 'Leveranciers sync',
      type: 'supplier',
      status: 'demo',
      lastSyncAt: null,
      detail: 'Demo leveranciersmonitoring',
    });
  } else {
    services.push({
      id: 'supplier-sync',
      name: 'Leveranciers sync',
      type: 'supplier',
      status: suppliers.some((s) => s.autoSyncEnabled) ? 'connected' : 'disconnected',
      lastSyncAt: latestChange?.createdAt.toISOString() ?? null,
      detail: `${suppliers.length} leverancier(s)`,
    });
  }

  services.push({
    id: 'payment-demo',
    name: 'Betaalgateway (Stripe)',
    type: 'payment',
    status: 'demo',
    lastSyncAt: new Date(Date.now() - 3600_000).toISOString(),
    detail: 'Demo — geen live koppeling',
  });

  return services;
}
