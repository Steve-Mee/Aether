import {
  analyzeMarginsTool,
  suggestOptimalPriceTool,
  createSupplierTool,
  getSupplierPriceIntelTool,
  getInventoryStatusTool,
  listLowStockTool,
  suggestRestockTool,
  getCustomerOverviewTool,
  getTopCustomersTool,
  getOrderTrendsTool,
  getRecentOrdersTool,
  getCustomerSegmentsTool,
  getChurnSignalsTool,
  getForecastSummaryTool,
  listForecastsTool,
  forecastProductDemandTool,
  listPendingApprovalsTool,
  summarizeApprovalsByModuleTool,
  approveLowRiskTool,
  getOutcomesSummaryTool,
  getLatestProposedOutcomeTool,
  verifyLatestOutcomeTool,
  listActiveNegotiationsTool,
  getNegotiationDetailTool,
  proposeCounterOfferTool,
  suggestPromotionTool,
  suggestClearancePricingTool,
  createPromotionTool,
  getEmailSummaryTool,
  listProductsTool,
  searchCatalogProductsTool,
  proposeCreateProductTool,
  getAutonomyMetricsTool,
  listDecisionsTool,
  evaluateDecisionTool,
  routeAutonomousDecisionTool,
} from '../agents';
import { DemandForecaster } from '../../../../modules/predictive-commerce/application/services/DemandForecaster';
import { demandForecastAdapter } from '../../../../modules/predictive-commerce/infrastructure/adapters/PrismaDemandForecastAdapter';
import { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';
import type { IntelligenceLayerDeps } from '../../resolveIntelligenceDeps';

export type CommerceToolsSegment = 'core' | 'catalog' | 'autonomy';

export interface RegisterCommerceToolsInput {
  toolRegistry: PersonalBrainToolRegistry;
  deps: IntelligenceLayerDeps;
  personalBrainRegistry: PersonalBrainRegistry;
  segment: CommerceToolsSegment;
  /** Invoked after promotion tools in the `core` segment (run-memory tools slot). */
  afterPromotion?: () => void;
}

export function registerCommerceTools(input: RegisterCommerceToolsInput): void {
  const { toolRegistry, deps, personalBrainRegistry, segment, afterPromotion } = input;
  const adminData = deps.adminData!;

  if (segment === 'core') {
    toolRegistry.register(analyzeMarginsTool({ adminData, personalBrains: personalBrainRegistry }));
    toolRegistry.register(
      suggestOptimalPriceTool({
        adminData,
        personalBrains: personalBrainRegistry,
        dynamicPricingEngine: deps.dynamicPricingEngine,
      })
    );
    toolRegistry.register(createSupplierTool({ adminData }));
    toolRegistry.register(getSupplierPriceIntelTool({ adminData }));
    toolRegistry.register(getInventoryStatusTool({ adminData }));
    toolRegistry.register(listLowStockTool({ adminData }));
    toolRegistry.register(suggestRestockTool({ adminData }));
    toolRegistry.register(getCustomerOverviewTool({ adminData }));
    toolRegistry.register(getTopCustomersTool({ adminData }));
    toolRegistry.register(getOrderTrendsTool({ adminData }));
    toolRegistry.register(getRecentOrdersTool({ adminData }));
    toolRegistry.register(getCustomerSegmentsTool({ adminData }));
    toolRegistry.register(getChurnSignalsTool({ adminData }));
    const demandForecaster = new DemandForecaster(demandForecastAdapter);
    toolRegistry.register(getForecastSummaryTool({ adminData, demandForecaster }));
    toolRegistry.register(listForecastsTool({ adminData, demandForecaster }));
    toolRegistry.register(forecastProductDemandTool({ adminData, demandForecaster }));
    toolRegistry.register(listPendingApprovalsTool({ adminData }));
    toolRegistry.register(summarizeApprovalsByModuleTool({ adminData }));
    toolRegistry.register(approveLowRiskTool({ adminData }));
    toolRegistry.register(getOutcomesSummaryTool({ adminData }));
    toolRegistry.register(getLatestProposedOutcomeTool({ adminData }));
    toolRegistry.register(verifyLatestOutcomeTool({ adminData }));
    toolRegistry.register(listActiveNegotiationsTool({ adminData }));
    toolRegistry.register(getNegotiationDetailTool({ adminData }));
    toolRegistry.register(proposeCounterOfferTool({ adminData }));
    toolRegistry.register(suggestPromotionTool({ adminData }));
    toolRegistry.register(suggestClearancePricingTool({ adminData }));
    toolRegistry.register(createPromotionTool());
    afterPromotion?.();
    return;
  }

  if (segment === 'catalog') {
    toolRegistry.register(getEmailSummaryTool({ adminData }));
    toolRegistry.register(listProductsTool({ adminData }));
    toolRegistry.register(searchCatalogProductsTool({ adminData }));
    toolRegistry.register(proposeCreateProductTool({ adminData }));
    return;
  }

  toolRegistry.register(getAutonomyMetricsTool());
  toolRegistry.register(listDecisionsTool({ decisionRepository: deps.decisionRepository }));
  toolRegistry.register(evaluateDecisionTool());
  toolRegistry.register(routeAutonomousDecisionTool());
}
