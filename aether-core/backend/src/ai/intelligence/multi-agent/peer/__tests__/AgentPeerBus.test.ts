import { AgentOrchestrator } from '../../AgentSupervisorOrchestrator';
import { AgentRegistry } from '../../AgentRegistry';
import { pricingAgentDefinition } from '../../agents/PricingAgent';
import { inventoryAgentDefinition } from '../../agents/InventoryAgent';
import { AgentPeerBus } from '../AgentPeerBus';

jest.mock('../PeerHandoffAuditLog', () => ({
  PeerHandoffAuditLog: jest.fn().mockImplementation(() => ({
    record: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('AgentPeerBus', () => {
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

  it('executes peer handoff via orchestrator', async () => {
    const registry = new AgentRegistry([pricingAgentDefinition, inventoryAgentDefinition]);
    const mockOrchestrator = {
      chainHandoff: jest.fn().mockResolvedValue({
        narrative: 'Inventory intel ready',
        agentRunId: 'run-inv',
      }),
    } as unknown as AgentOrchestrator;

    const bus = new AgentPeerBus(registry, mockOrchestrator);
    const result = await bus.requestPeerHandoff({
      tenantId: 't1',
      sourceAgentKey: 'pricing',
      targetAgentKey: 'inventory',
      intent: 'INVENTORY_STATUS',
      query: 'list low stock',
      depth: 0,
    });

    expect(result.success).toBe(true);
    expect(result.narrative).toBe('Inventory intel ready');
    expect(mockOrchestrator.chainHandoff).toHaveBeenCalled();
  });
});
