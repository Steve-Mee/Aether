import { pricingAgentDefinition } from './PricingAgent';
import { supplierAgentDefinition } from './SupplierAgent';
import { inventoryAgentDefinition } from './InventoryAgent';
import { mailAgentDefinition } from './MailAgent';
import { workflowSupervisorDefinition } from './WorkflowSupervisorAgent';
import { customerInsightsAgentDefinition } from './CustomerInsightsAgent';
import { forecastAgentDefinition } from './ForecastAgent';
import { approvalsAgentDefinition } from './ApprovalsAgent';
import { outcomesAgentDefinition } from './OutcomesAgent';
import { negotiationAgentDefinition } from './NegotiationAgent';
import { promotionAgentDefinition } from './PromotionAgent';
import { returnsAgentDefinition } from './ReturnsAgent';
import { catalogAgentDefinition } from './CatalogAgent';
import { autonomyAgentDefinition } from './AutonomyAgent';
import { storeBuilderAgentDefinition } from './StoreBuilderAgent';
import { designAgentDefinition } from './DesignAgent';
import { copySeoAgentDefinition } from './CopySeoAgent';
import { storeQaAgentDefinition } from './StoreQAAgent';
import type { SpecialistAgentDefinition } from '../types';

export { pricingAgentDefinition, PRICING_AGENT_KEY, PRICING_SUPPORTED_INTENTS } from './PricingAgent';
export { supplierAgentDefinition, SUPPLIER_AGENT_KEY } from './SupplierAgent';
export { inventoryAgentDefinition, INVENTORY_AGENT_KEY } from './InventoryAgent';
export { mailAgentDefinition, MAIL_AGENT_KEY } from './MailAgent';
export {
  customerInsightsAgentDefinition,
  CUSTOMER_AGENT_KEY,
  CUSTOMER_SUPPORTED_INTENTS,
} from './CustomerInsightsAgent';
export { forecastAgentDefinition, FORECAST_AGENT_KEY } from './ForecastAgent';
export { approvalsAgentDefinition, APPROVALS_AGENT_KEY } from './ApprovalsAgent';
export { outcomesAgentDefinition, OUTCOMES_AGENT_KEY } from './OutcomesAgent';
export { negotiationAgentDefinition, NEGOTIATION_AGENT_KEY } from './NegotiationAgent';
export { catalogAgentDefinition, CATALOG_AGENT_KEY } from './CatalogAgent';
export { autonomyAgentDefinition, AUTONOMY_AGENT_KEY } from './AutonomyAgent';
export {
  storeBuilderAgentDefinition,
  STORE_BUILDER_AGENT_KEY,
  STORE_BUILDER_SUPPORTED_INTENTS,
} from './StoreBuilderAgent';
export { designAgentDefinition, DESIGN_AGENT_KEY, DESIGN_SUPPORTED_INTENTS } from './DesignAgent';
export {
  copySeoAgentDefinition,
  COPY_SEO_AGENT_KEY,
  COPY_SEO_SUPPORTED_INTENTS,
} from './CopySeoAgent';
export { storeQaAgentDefinition, STORE_QA_AGENT_KEY, STORE_QA_SUPPORTED_INTENTS } from './StoreQAAgent';
export { globalAdvisoryAgentDefinition } from './GlobalAdvisoryAgent';
export { GLOBAL_ADVISORY_AGENT_KEY } from '../peer/FederatedPeerPort';
export { analyzeMarginsTool, suggestOptimalPriceTool } from './pricingTools';
export { createSupplierTool, getSupplierPriceIntelTool } from './supplierTools';
export { getInventoryStatusTool, listLowStockTool, suggestRestockTool } from './inventoryTools';
export {
  getCustomerOverviewTool,
  getTopCustomersTool,
  getOrderTrendsTool,
  getRecentOrdersTool,
  getCustomerSegmentsTool,
  getChurnSignalsTool,
} from './customerTools';
export {
  getForecastSummaryTool,
  listForecastsTool,
  forecastProductDemandTool,
} from './forecastTools';
export {
  listPendingApprovalsTool,
  summarizeApprovalsByModuleTool,
  approveLowRiskTool,
} from './approvalTools';
export {
  getOutcomesSummaryTool,
  getLatestProposedOutcomeTool,
  verifyLatestOutcomeTool,
} from './outcomesTools';
export {
  listActiveNegotiationsTool,
  getNegotiationDetailTool,
  proposeCounterOfferTool,
} from './negotiationTools';
export {
  suggestPromotionTool,
  suggestClearancePricingTool,
  createPromotionTool,
  detectMarketingOpportunitiesTool,
  suggestBundleTool,
  suggestCampaignChannelTool,
} from './promotionTools';
export { promotionAgentDefinition, PROMOTION_AGENT_KEY } from './PromotionAgent';
export {
  returnsAgentDefinition,
  RETURNS_AGENT_KEY,
  RETURNS_SUPPORTED_INTENTS,
} from './ReturnsAgent';
export {
  analyzeReturnPatternsTool,
  signalSupplierQualityIssuesTool,
  suggestReturnReductionTool,
} from './returnsTools';
export {
  listProductsTool,
  searchCatalogProductsTool,
  proposeCreateProductTool,
} from './catalogTools';
export {
  getAutonomyMetricsTool,
  listDecisionsTool,
  evaluateDecisionTool,
  routeAutonomousDecisionTool,
} from './autonomyTools';
export { getEmailSummaryTool, getEmailContentSummaryTool, draftEmailReplyTool } from './mailTools';
export {
  createSiteProjectTool,
  createRevisionFromBriefTool,
  runBuildTool,
  proposePublishTool,
  getStoreStatusTool,
} from './storeBuilderTools';
export { proposeLayoutTool, proposeTokensTool, proposePageTreeTool } from './designTools';
export { proposeCopyTool, proposeMetaTool, localizeTool } from './copySeoTools';
export { runBuildChecksTool, runLighthouseTool, diffRevisionsTool } from './storeQaTools';
export {
  buildFallbackSitePlan,
  buildFallbackPageTree,
  buildFallbackTokens,
} from './storefrontPlanFallback';
export { workflowSupervisorDefinition, WORKFLOW_SUPERVISOR_KEY } from './WorkflowSupervisorAgent';
export {
  planGoalSubtasksTool,
  synthesizeAgentResultsTool,
  requestHitlGateTool,
} from './supervisorTools';

export const DEFAULT_SPECIALIST_AGENTS: SpecialistAgentDefinition[] = [
  pricingAgentDefinition,
  supplierAgentDefinition,
  inventoryAgentDefinition,
  mailAgentDefinition,
  customerInsightsAgentDefinition,
  forecastAgentDefinition,
  approvalsAgentDefinition,
  outcomesAgentDefinition,
  negotiationAgentDefinition,
  promotionAgentDefinition,
  returnsAgentDefinition,
  catalogAgentDefinition,
  autonomyAgentDefinition,
  storeBuilderAgentDefinition,
  designAgentDefinition,
  copySeoAgentDefinition,
  storeQaAgentDefinition,
  workflowSupervisorDefinition,
];
