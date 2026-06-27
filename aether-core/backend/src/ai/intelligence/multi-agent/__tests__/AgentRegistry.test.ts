import { AgentRegistry } from '../AgentRegistry';
import { pricingAgentDefinition } from '../agents/PricingAgent';
import { supplierAgentDefinition } from '../agents/SupplierAgent';
import { inventoryAgentDefinition } from '../agents/InventoryAgent';
import { mailAgentDefinition } from '../agents/MailAgent';

describe('AgentRegistry', () => {
  const prevEnv = process.env.MULTI_AGENT_DELEGATION_ENABLED;

  beforeEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevEnv;
  });

  it('registers and retrieves agents by key', () => {
    const registry = new AgentRegistry([
      pricingAgentDefinition,
      supplierAgentDefinition,
      inventoryAgentDefinition,
      mailAgentDefinition,
    ]);
    expect(registry.get('pricing')?.displayName).toBe('Pricing Agent');
    expect(registry.get('mail')?.displayName).toBe('Mail Agent');
    expect(registry.list()).toHaveLength(4);
  });

  it('resolves mail and inventory intents', () => {
    const registry = new AgentRegistry([
      pricingAgentDefinition,
      supplierAgentDefinition,
      inventoryAgentDefinition,
      mailAgentDefinition,
    ]);
    expect(registry.resolve('EMAIL_SUMMARY')?.agentKey).toBe('mail');
    expect(registry.resolve('INVENTORY_STATUS')?.agentKey).toBe('inventory');
  });

  it('resolves pricing intents to pricing agent', () => {
    const registry = new AgentRegistry([pricingAgentDefinition, supplierAgentDefinition]);
    expect(registry.resolve('PRICE_UPDATE')?.agentKey).toBe('pricing');
    expect(registry.resolve('LOW_MARGIN_REPORT')?.agentKey).toBe('pricing');
    expect(registry.resolve('PRICING_OPTIMIZE')?.agentKey).toBe('pricing');
  });

  it('resolves supplier intents to supplier agent', () => {
    const registry = new AgentRegistry([pricingAgentDefinition, supplierAgentDefinition]);
    expect(registry.resolve('SUPPLIER_MONITOR')?.agentKey).toBe('supplier');
  });

  it('falls back to keyword patterns for pricing', () => {
    const registry = new AgentRegistry([pricingAgentDefinition]);
    expect(registry.resolve('UNKNOWN', 'optimaliseer mijn prijzen')?.agentKey).toBe('pricing');
  });

  it('returns null when delegation disabled', () => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'false';
    const registry = new AgentRegistry([pricingAgentDefinition]);
    expect(registry.resolve('PRICE_UPDATE')).toBeNull();
  });
});
