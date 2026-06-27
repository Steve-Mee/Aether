import { pricingAgentDefinition } from './PricingAgent';
import { supplierAgentDefinition } from './SupplierAgent';
import { inventoryAgentDefinition } from './InventoryAgent';
import { mailAgentDefinition } from './MailAgent';
import type { SpecialistAgentDefinition } from '../types';

export { pricingAgentDefinition, PRICING_AGENT_KEY, PRICING_SUPPORTED_INTENTS } from './PricingAgent';
export { supplierAgentDefinition, SUPPLIER_AGENT_KEY } from './SupplierAgent';
export { inventoryAgentDefinition, INVENTORY_AGENT_KEY } from './InventoryAgent';
export { mailAgentDefinition, MAIL_AGENT_KEY } from './MailAgent';
export { analyzeMarginsTool, suggestOptimalPriceTool } from './pricingTools';
export { createSupplierTool } from './supplierTools';
export { getInventoryStatusTool, listLowStockTool, suggestRestockTool } from './inventoryTools';
export { getEmailSummaryTool } from './mailTools';

export const DEFAULT_SPECIALIST_AGENTS: SpecialistAgentDefinition[] = [
  pricingAgentDefinition,
  supplierAgentDefinition,
  inventoryAgentDefinition,
  mailAgentDefinition,
];
