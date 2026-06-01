const API_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_AETHER_API_KEY || 'dev-api-key-change-in-production';
const TENANT = import.meta.env.VITE_AETHER_TENANT || 'tenant_default';

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Aether-Api-Key': API_KEY,
    'X-Aether-Tenant-Id': TENANT,
  };
}

export async function apiStreamFetch(path: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    headers: {
      'X-Aether-Api-Key': API_KEY,
      'X-Aether-Tenant-Id': TENANT,
      Accept: 'text/event-stream',
    },
    signal,
  });
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export type FeatureStatus = 'live' | 'partial' | 'experimental';

export interface TruthStatusDocument {
  version: string;
  updatedAt: string;
  claimPolicy: string;
  features: Record<string, { status: string; label: string }>;
  phases: Record<string, { status: string; label: string }>;
}

export interface OperatingMetrics {
  tenantSafetyScore: number;
  gatePassRate: number;
  autonomyRate: number;
  autonomyIncidentRate: number;
  causalUpliftVerified: number;
  rollbackSuccessRate: number;
  killFastCandidates: string[];
  killFastDisabled?: string[];
  truthReviewDue: boolean;
  lastTruthReviewAt: string | null;
}

export interface DashboardSummary {
  status: FeatureStatus;
  productCount: number;
  lowMarginProducts: number;
  unreadEmails: number;
  pendingApprovals: number;
  recentCommands: number;
  revenueUplift30d: number;
  emailMetrics?: {
    classificationRate: number;
    escalationRate: number;
    targetsMet: { classificationAbove60Pct: boolean; escalationBelow15Pct: boolean };
  };
  autonomyRate?: number;
  autonomyTargetMet?: boolean;
  timeSavedMinutes7d?: number;
  nlActionShare7d?: number;
  autonomousActions7d?: number;
  commands7d?: number;
  manualNavEvents7d?: number;
}

export interface BillingSummary {
  periodDays: number;
  totalRecords: number;
  totalAmount: number;
  reconciledCount: number;
  records: Array<{
    id: string;
    outcomeId: string;
    amount: number;
    currency: string;
    status: string;
    stripeInvoiceId?: string | null;
    reconciledAt?: string | null;
    createdAt: string;
  }>;
}

export interface ProductRow {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
}

export interface TenantApprovalPolicy {
  autoApproveLowRisk: boolean;
  autoApproveMediumRiskMail: boolean;
  maxAutoPriceChangePct: number;
  enabled: boolean;
}

export interface EmailDetail {
  id: string;
  from: string;
  subject: string | null;
  body: string | null;
  status: string;
  riskLevel: string | null;
  category: string | null;
  confidence: number | null;
  draftReply: string | null;
  createdAt: string;
}

export interface SupplierChangeRow {
  id: string;
  supplierId: string;
  changeType: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
}
