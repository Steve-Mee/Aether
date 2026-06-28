import { AgentOrchestrator } from '../../AgentSupervisorOrchestrator';
import { AgentRegistry } from '../../AgentRegistry';
import { pricingAgentDefinition } from '../../agents/PricingAgent';
import { inventoryAgentDefinition } from '../../agents/InventoryAgent';
import { AgentPeerBus } from '../AgentPeerBus';

jest.mock('../../../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../PeerHandoffAuditLog', () => ({
  PeerHandoffAuditLog: jest.fn().mockImplementation(() => ({
    record: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('AgentPeerBus notify path', () => {
  const prevPeer = process.env.MULTI_AGENT_PEER_DELEGATION;
  const prevDelegation = process.env.MULTI_AGENT_DELEGATION_ENABLED;
  const prevNotify = process.env.MULTI_AGENT_NOTIFY_PEER;

  beforeEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
    process.env.MULTI_AGENT_PEER_DELEGATION = 'true';
    process.env.MULTI_AGENT_NOTIFY_PEER = 'true';
  });

  afterEach(() => {
    process.env.MULTI_AGENT_PEER_DELEGATION = prevPeer;
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevDelegation;
    process.env.MULTI_AGENT_NOTIFY_PEER = prevNotify;
  });

  it('does not call orchestrator for notify messages', async () => {
    const registry = new AgentRegistry([pricingAgentDefinition, inventoryAgentDefinition]);
    const mockOrchestrator = {
      chainHandoff: jest.fn(),
    } as unknown as AgentOrchestrator;

    const bus = new AgentPeerBus(registry, mockOrchestrator);
    const result = await bus.requestPeerHandoff({
      tenantId: 't1',
      sourceAgentKey: 'inventory',
      targetAgentKey: 'pricing',
      intent: 'PRICING_OPTIMIZE',
      query: 'FYI: low stock alert',
      depth: 0,
      contextPayload: {
        messageType: 'notify',
        summary: 'Low stock heads-up',
        payload: { lowStockSkus: [{ productId: 'p1', quantity: 2 }] },
      },
    });

    expect(result.success).toBe(true);
    expect(mockOrchestrator.chainHandoff).not.toHaveBeenCalled();
    expect(result.agentRunId).toBeUndefined();
  });
});
