import { FederatedAggregationService, PrivacyBudgetService } from './application/services/HiveMindServices';
import {
  privacyBudgetAdapter,
  insightQueryAdapter,
} from './infrastructure/adapters/PrismaPrivacyBudgetAdapter';
import { federatedHiveJobAdapter } from './infrastructure/adapters/FederatedHiveJobAdapter';

export const privacyBudgetService = new PrivacyBudgetService(privacyBudgetAdapter);
export const federatedAggregationService = new FederatedAggregationService(
  federatedHiveJobAdapter,
  insightQueryAdapter,
  privacyBudgetAdapter
);
