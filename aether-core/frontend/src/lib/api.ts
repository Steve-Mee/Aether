/** @deprecated Import from '@/lib/api' — kept for backward compatibility. */
export {
  apiFetch,
  apiStreamFetch,
  getApiConfig,
  setAuthToken,
  setAuthTenantId,
  getAuthTenantId,
  setOnUnauthorized,
  apiRoutes,
  type ApiClientOptions,
} from './api/index';
export {
  ApiError,
  NetworkError,
  isApiError,
  isNetworkError,
  classifyError,
  toUserMessage,
  type ErrorKind,
} from './api/errors';

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
  lowRiskAutonomous24h?: number;
  commands7d?: number;
  manualNavEvents7d?: number;
  tenantDisplayName?: string;
  timestamp?: string;
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

export type {
  AutonomyLevel,
  AutoRunWindow,
  Locale,
  NotificationFrequency,
  NotificationChannelPrefs,
  NotificationPrefs,
  MerchantSettings,
} from './settings/merchantSettingsTypes';

export { DEFAULT_MERCHANT_SETTINGS } from './settings/merchantSettingsTypes';

export interface ConnectedService {
  id: string;
  name: string;
  type: 'email' | 'supplier' | 'payment';
  status: 'connected' | 'disconnected' | 'error' | 'demo';
  lastSyncAt: string | null;
  detail?: string;
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

export type {
  SupplierOverviewApiResponse,
  SupplierDetail,
  SupplierListItem,
} from '@/types/supplier';
