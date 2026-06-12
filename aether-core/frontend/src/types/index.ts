/**
 * Domain entity types — import from `@/types` or `@/types/<module>`.
 */

export type {
  ApprovalItem,
  ApprovalStatus,
  ApprovalTab,
  ApprovalDateFilter,
  HandledOutcome,
  RecentlyHandledApproval,
  ResolveApprovalInput,
  ResolveApprovalResponse,
  AutoApplyApprovalsResponse,
} from './approval';

export type {
  ActivityItem,
  ActivityFeedResponse,
  ActivityPeriod,
  ActivityRisk,
  ActivityStatus,
  ActivityExecutor,
  ActivityCategory,
  ActivityRiskFilter,
  ActivityExecutorFilter,
  ActivityStatusFilter,
  ActivityImpact,
  ActivityRelated,
  ActivityFilters,
  ActivityCustomRange,
} from './activity';

export type {
  SupplierStatusTab,
  SupplierMonitoringLabel,
  SupplierStatus,
  SupplierSyncSource,
  SupplierOverviewStats,
  SupplierListItem,
  SupplierChangeDetail,
  SupplierChangeRow,
  SupplierProductDetail,
  SupplierSyncHistoryItem,
  SupplierDetail,
  SupplierOverviewApiResponse,
  SuppliersViewModel,
  SuppliersViewSource,
} from './supplier';

export type {
  CommandResult,
  ExecuteCommandRequest,
  CommandHistoryItem,
  UndoCommandResponse,
} from './command';

export type {
  OutcomeRecord,
  OutcomeReport,
  AutonomyMetrics,
  AutonomyMetricsResponse,
  MetricTrend,
  MetricSource,
  InsightMetric,
  InsightsPeriod,
  InsightsMetricSources,
  InsightsMetricView,
  InsightsViewModel,
} from './insight';

export type {
  AppNotification,
  AetherNotification,
  PushNotificationInput,
  NotificationSeverity,
  NotificationSource,
  NotificationKind,
  NotificationCategory,
} from './notification';
