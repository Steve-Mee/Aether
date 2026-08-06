import type { ConnectedService, OperatingMetrics, TruthStatusDocument } from '@/lib/api';
import {
  DEFAULT_MERCHANT_SETTINGS,
  type MerchantSettings,
} from '@/lib/settings/merchantSettingsTypes';

/** Demo/mock adapter: skip first-run onboarding gate (production default remains false). */
const DEMO_MERCHANT_SETTINGS: MerchantSettings = {
  ...DEFAULT_MERCHANT_SETTINGS,
  onboardingCompleted: true,
};

let mockSettings: MerchantSettings = { ...DEMO_MERCHANT_SETTINGS };

export function getSettingsDemo(): MerchantSettings {
  return { ...mockSettings };
}

export function patchSettingsDemo(patch: Partial<MerchantSettings>): MerchantSettings {
  mockSettings = { ...mockSettings, ...patch };
  return { ...mockSettings };
}

export function resetSettingsDemo(): void {
  mockSettings = { ...DEMO_MERCHANT_SETTINGS };
}

export function getConnectedServicesDemo(): ConnectedService[] {
  return [
    {
      id: 'svc_email',
      name: 'IMAP Inbox',
      type: 'email',
      status: 'demo',
      lastSyncAt: new Date().toISOString(),
      detail: 'Mock inbox — 3 messages',
    },
    {
      id: 'svc_supplier',
      name: 'Supplier monitor',
      type: 'supplier',
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: 'svc_payment',
      name: 'Stripe',
      type: 'payment',
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 86400_000).toISOString(),
    },
  ];
}

export function getOperatingMetricsDemo(): OperatingMetrics {
  return {
    tenantSafetyScore: 0.92,
    gatePassRate: 0.88,
    autonomyRate: 0.78,
    autonomyIncidentRate: 0.02,
    causalUpliftVerified: 12400,
    rollbackSuccessRate: 1.0,
    killFastCandidates: [],
    truthReviewDue: false,
    lastTruthReviewAt: new Date(Date.now() - 604800_000).toISOString(),
  };
}

export function getTruthStatusDemo(): TruthStatusDocument {
  return {
    version: 'mock-1',
    updatedAt: new Date().toISOString(),
    claimPolicy: 'demo',
    features: {
      approvals: { status: 'live', label: 'Approvals' },
      suppliers: { status: 'live', label: 'Suppliers' },
      emails: { status: 'partial', label: 'Mail' },
      orders: { status: 'partial', label: 'Orders' },
      products: { status: 'live', label: 'Products' },
      autonomous: { status: 'experimental', label: 'Autonomous' },
    },
    phases: {
      core: { status: 'live', label: 'Core' },
    },
  };
}
