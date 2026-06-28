import { getDataAdapter } from '../createDataAdapter';

export const insightsRepository = {
  outcomeReport: (days: number) => getDataAdapter().fetchOutcomeReport(days),
  autonomyMetrics: (days: number) => getDataAdapter().fetchAutonomyMetrics(days),
  billingSummary: (days: number) => getDataAdapter().fetchBillingSummary(days),
  reconcileBilling: () => getDataAdapter().reconcileBilling(),
};
