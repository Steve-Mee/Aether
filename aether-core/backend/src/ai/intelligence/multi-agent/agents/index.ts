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
import { catalogAgentDefinition } from './CatalogAgent';
import { autonomyAgentDefinition } from './AutonomyAgent';
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
export { getEmailSummaryTool } from './mailTools';
export { workflowSupervisorDefinition, WORKFLOW_SUPERVISOR_KEY } from './WorkflowSupervisorAgent';

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
  catalogAgentDefinition,
  autonomyAgentDefinition,
  workflowSupervisorDefinition,
];
