import { AgentRegistry } from '../../AgentRegistry';
import { pricingAgentDefinition } from '../../agents/PricingAgent';
import { inventoryAgentDefinition } from '../../agents/InventoryAgent';
import { PeerDelegationGuard, isPeerDelegationEnabled } from '../PeerDelegationGuard';

describe('PeerDelegationGuard', () => {
  const prevPeer = process.env.MULTI_AGENT_PEER_DELEGATION;
  const prevDelegation = process.env.MULTI_AGENT_DELEGATION_ENABLED;

  beforeEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
    process.env.MULTI_AGENT_PEER_DELEGATION = 'true';
  });

  afterEach(() => {
    process.env.MULTI_AGENT_PEER_DELEGATION = prevPeer;
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevDelegation;
  });

  it('is enabled when flags set', () => {
    expect(isPeerDelegationEnabled()).toBe(true);
  });

  it('allows pricing to delegate to inventory', () => {
    const registry = new AgentRegistry([pricingAgentDefinition, inventoryAgentDefinition]);
    const guard = new PeerDelegationGuard(registry);
    const result = guard.validate({
      tenantId: 't1',
      sourceAgentKey: 'pricing',
      targetAgentKey: 'inventory',
      intent: 'INVENTORY_STATUS',
      query: 'low stock items',
      depth: 0,
    });
    expect(result.ok).toBe(true);
  });

  it('blocks delegation to non-whitelisted target', () => {
    const registry = new AgentRegistry([pricingAgentDefinition, inventoryAgentDefinition]);
    const guard = new PeerDelegationGuard(registry);
    const result = guard.validate({
      tenantId: 't1',
      sourceAgentKey: 'pricing',
      targetAgentKey: 'mail',
      intent: 'EMAIL_SUMMARY',
      query: 'inbox',
      depth: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('blocks mutating intents via peer delegation', () => {
    const registry = new AgentRegistry([pricingAgentDefinition, inventoryAgentDefinition]);
    const guard = new PeerDelegationGuard(registry);
    const result = guard.validate({
      tenantId: 't1',
      sourceAgentKey: 'pricing',
      targetAgentKey: 'inventory',
      intent: 'RESTOCK_SUGGEST',
      query: 'restock',
      depth: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('blocks when depth limit exceeded', () => {
    process.env.MULTI_AGENT_PEER_MAX_DEPTH = '1';
    const registry = new AgentRegistry([pricingAgentDefinition, inventoryAgentDefinition]);
    const guard = new PeerDelegationGuard(registry);
    const result = guard.validate({
      tenantId: 't1',
      sourceAgentKey: 'pricing',
      targetAgentKey: 'inventory',
      intent: 'INVENTORY_STATUS',
      query: 'stock',
      depth: 1,
    });
    expect(result.ok).toBe(false);
    delete process.env.MULTI_AGENT_PEER_MAX_DEPTH;
  });

  it('allows global-advisory without canDelegateTo check', () => {
    const registry = new AgentRegistry([pricingAgentDefinition, inventoryAgentDefinition]);
    const guard = new PeerDelegationGuard(registry);
    const result = guard.validate({
      tenantId: 't1',
      sourceAgentKey: 'pricing',
      targetAgentKey: 'global-advisory',
      intent: 'GLOBAL_ADVISORY',
      query: 'industry trends',
      depth: 0,
    });
    expect(result.ok).toBe(true);
  });

  it('blocks disallowed payload keys for supplier to pricing', () => {
    const registry = new AgentRegistry([pricingAgentDefinition, inventoryAgentDefinition]);
    const { supplierAgentDefinition } = require('../../agents/SupplierAgent');
    const reg = new AgentRegistry([supplierAgentDefinition, pricingAgentDefinition]);
    const guard = new PeerDelegationGuard(reg);
    const result = guard.validate({
      tenantId: 't1',
      sourceAgentKey: 'supplier',
      targetAgentKey: 'pricing',
      intent: 'PRICING_OPTIMIZE',
      query: 'review prices',
      depth: 0,
      contextPayload: {
        messageType: 'intel',
        summary: 'test',
        payload: { customerEmail: 'secret@example.com' },
      },
    });
    expect(result.ok).toBe(false);
  });

  it('allows scoped payload keys for supplier to pricing', () => {
    const { supplierAgentDefinition } = require('../../agents/SupplierAgent');
    const reg = new AgentRegistry([supplierAgentDefinition, pricingAgentDefinition]);
    const guard = new PeerDelegationGuard(reg);
    const result = guard.validate({
      tenantId: 't1',
      sourceAgentKey: 'supplier',
      targetAgentKey: 'pricing',
      intent: 'PRICING_OPTIMIZE',
      query: 'review prices',
      depth: 0,
      contextPayload: {
        messageType: 'intel',
        summary: 'test',
        payload: { suggestedPricingActions: [{ productId: 'p1', action: 'review_price_decrease_opportunity' }] },
      },
    });
    expect(result.ok).toBe(true);
  });
});
