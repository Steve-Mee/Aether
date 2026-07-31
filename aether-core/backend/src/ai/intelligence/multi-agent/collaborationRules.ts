import { CATALOG_NEGOTIATION_RULES } from './collaboration/catalogNegotiationRules';
import type { CollaborationRule } from './collaboration/collaborationRuleTypes';
import { CUSTOMER_CHAIN_RULES } from './collaboration/customerChainRules';
import { FORECAST_OUTCOMES_RULES } from './collaboration/forecastOutcomesRules';
import { PARALLEL_INTEL_RULES } from './collaboration/parallelIntelRules';
import { PRICING_INVENTORY_PROMO_RULES } from './collaboration/pricingInventoryPromoRules';

export type { CollaborationRule } from './collaboration/collaborationRuleTypes';

export const DEFAULT_RULES: CollaborationRule[] = [
  ...PARALLEL_INTEL_RULES,
  ...CUSTOMER_CHAIN_RULES,
  ...FORECAST_OUTCOMES_RULES,
  ...CATALOG_NEGOTIATION_RULES,
  ...PRICING_INVENTORY_PROMO_RULES,
];
