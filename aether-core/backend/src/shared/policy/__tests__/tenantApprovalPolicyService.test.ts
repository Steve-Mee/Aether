jest.mock('../../prisma/client', () => ({
  prisma: {
    tenantSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../prisma/client';
import {
  DEFAULT_MERCHANT_SETTINGS,
  isAutonomousWindowOpen,
  parseNotificationPrefs,
} from '../../settings/merchantSettingsTypes';
import { getMerchantSettings, updateMerchantSettings } from '../../settings/TenantSettingsService';
import {
  assessApprovalAutoEligible,
  getTenantApprovalPolicy,
  setTenantApprovalPolicy,
} from '../tenantApprovalPolicyService';

const mockFindUnique = prisma.tenantSettings.findUnique as jest.Mock;
const mockUpsert = prisma.tenantSettings.upsert as jest.Mock;
const mockUpdate = prisma.tenantSettings.update as jest.Mock;

const baseRow = {
  tenantId: 'tenant_test',
  autonomyLevel: 'medium',
  autoApproveLowRisk: true,
  autoApproveMediumRiskMail: false,
  maxAutoPriceChangePct: 5,
  maxMarginImpactEuro: 500,
  policyEnabled: true,
  autoRunWindow: 'always',
  autoRunWindowStart: '18:00',
  autoRunWindowEnd: '08:00',
  notificationPrefs: DEFAULT_MERCHANT_SETTINGS.notificationPrefs,
  locale: 'nl',
  dataExportEnabled: true,
  brainAdaptiveAutoExecuteEnabled: false,
  proactivePrefs: DEFAULT_MERCHANT_SETTINGS.proactivePrefs,
  explainabilityPrefs: DEFAULT_MERCHANT_SETTINGS.explainabilityPrefs,
  goalPrefs: DEFAULT_MERCHANT_SETTINGS.goalPrefs,
  autonomyPrefs: DEFAULT_MERCHANT_SETTINGS.autonomyPrefs,
  updatedAt: new Date(),
};

describe('tenantApprovalPolicyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue({ ...baseRow });
    mockUpsert.mockResolvedValue({ ...baseRow });
    mockUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...baseRow,
      ...data,
    }));
  });

  it('returns default policy for unknown tenant', async () => {
    mockFindUnique.mockResolvedValue(null);
    const policy = await getTenantApprovalPolicy('unknown_tenant_xyz');
    expect(policy.enabled).toBe(true);
    expect(policy.autoApproveLowRisk).toBe(true);
  });

  it('marks safe medium-risk mail as auto-eligible when mail policy enabled', async () => {
    mockFindUnique.mockResolvedValue({ ...baseRow, autoApproveMediumRiskMail: true });
    const result = await assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'aether-mail',
      actionType: 'auto_reply',
      payload: { category: 'faq' },
    });
    expect(result.eligible).toBe(true);
    expect(result.riskClass).toBe('medium');
  });

  it('blocks inventory low-risk when category auto-execute disabled', async () => {
    const result = await assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'inventory-pricing',
      actionType: 'stock_sync',
      payload: {},
    });
    expect(result.eligible).toBe(false);
    expect(result.riskClass).toBe('low');
  });

  it('allows inventory low-risk when category permits auto-execute', async () => {
    mockFindUnique.mockResolvedValue({
      ...baseRow,
      autonomyPrefs: {
        ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs,
        actionCategories: {
          ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories,
          inventory: {
            enabled: true,
            allowLowRiskAutoExecute: true,
            allowMediumRiskAutoExecute: false,
          },
        },
      },
    });
    const result = await assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'inventory-pricing',
      actionType: 'stock_sync',
      payload: {},
    });
    expect(result.eligible).toBe(true);
    expect(result.riskClass).toBe('low');
  });

  it('blocks auto-approve when disabled', async () => {
    mockFindUnique.mockResolvedValue({ ...baseRow, policyEnabled: false });
    const result = await assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'aether-mail',
      actionType: 'auto_reply',
      payload: {},
    });
    expect(result.eligible).toBe(false);
  });

  it('blocks high-risk refunds', async () => {
    const result = await assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'payment-fulfillment',
      actionType: 'refund',
      payload: { amount: 500 },
    });
    expect(result.eligible).toBe(false);
    expect(result.riskClass).toBe('high');
  });

  it('blocks when margin impact exceeds threshold', async () => {
    const result = await assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'inventory-pricing',
      actionType: 'price_sync',
      payload: { estimatedImpactEuro: 750 },
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/Marge-impact/);
  });

  it('updates policy via setTenantApprovalPolicy', async () => {
    const policy = await setTenantApprovalPolicy('tenant_test', { enabled: false });
    expect(policy.enabled).toBe(false);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe('merchantSettingsTypes', () => {
  it('parses notification prefs with defaults', () => {
    const prefs = parseNotificationPrefs({});
    expect(prefs.autonomousLowRisk.inApp).toBe(true);
    expect(prefs.frequency).toBe('immediate');
  });

  it('isAutonomousWindowOpen respects always mode', () => {
    expect(
      isAutonomousWindowOpen({
        autoRunWindow: 'always',
        autoRunWindowStart: '18:00',
        autoRunWindowEnd: '08:00',
      })
    ).toBe(true);
  });

  it('isAutonomousWindowOpen respects custom overnight window', () => {
    const noon = new Date('2026-06-03T12:00:00');
    const evening = new Date('2026-06-03T20:00:00');
    const settings = {
      autoRunWindow: 'custom' as const,
      autoRunWindowStart: '18:00',
      autoRunWindowEnd: '08:00',
    };
    expect(isAutonomousWindowOpen(settings, noon)).toBe(false);
    expect(isAutonomousWindowOpen(settings, evening)).toBe(true);
  });

  it('isAutonomousWindowOpen blocks autonomous during office hours for outside_office', () => {
    const noon = new Date('2026-06-03T12:00:00');
    const evening = new Date('2026-06-03T20:00:00');
    const settings = {
      autoRunWindow: 'outside_office' as const,
      autoRunWindowStart: '18:00',
      autoRunWindowEnd: '08:00',
    };
    expect(isAutonomousWindowOpen(settings, noon)).toBe(false);
    expect(isAutonomousWindowOpen(settings, evening)).toBe(true);
  });
});

describe('getMerchantSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns defaults when row missing', async () => {
    mockFindUnique.mockResolvedValue(null);
    const settings = await getMerchantSettings('missing');
    expect(settings.autonomyLevel).toBe('medium');
    expect(settings.maxMarginImpactEuro).toBe(500);
  });
});
