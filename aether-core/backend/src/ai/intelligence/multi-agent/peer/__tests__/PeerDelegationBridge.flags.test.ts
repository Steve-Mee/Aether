import {
  isPhysicalPeerEnabled,
  isNegotiationPeerEnabled,
  isInventoryPeerEnabled,
  isAutonomyPeerEnabled,
} from '../PeerDelegationBridge';

describe('PeerDelegationBridge feature flags', () => {
  const prev = {
    physical: process.env.MULTI_AGENT_PHYSICAL_PEER,
    negotiation: process.env.MULTI_AGENT_NEGOTIATION_PEER,
    inventory: process.env.MULTI_AGENT_INVENTORY_PEER,
    autonomy: process.env.MULTI_AGENT_AUTONOMY_PEER,
  };

  afterEach(() => {
    process.env.MULTI_AGENT_PHYSICAL_PEER = prev.physical;
    process.env.MULTI_AGENT_NEGOTIATION_PEER = prev.negotiation;
    process.env.MULTI_AGENT_INVENTORY_PEER = prev.inventory;
    process.env.MULTI_AGENT_AUTONOMY_PEER = prev.autonomy;
  });

  it('defaults all Phase 10 peer flags off', () => {
    delete process.env.MULTI_AGENT_PHYSICAL_PEER;
    delete process.env.MULTI_AGENT_NEGOTIATION_PEER;
    delete process.env.MULTI_AGENT_INVENTORY_PEER;
    delete process.env.MULTI_AGENT_AUTONOMY_PEER;
    expect(isPhysicalPeerEnabled()).toBe(false);
    expect(isNegotiationPeerEnabled()).toBe(false);
    expect(isInventoryPeerEnabled()).toBe(false);
    expect(isAutonomyPeerEnabled()).toBe(false);
  });

  it('enables flags when set', () => {
    process.env.MULTI_AGENT_PHYSICAL_PEER = 'true';
    process.env.MULTI_AGENT_NEGOTIATION_PEER = 'true';
    expect(isPhysicalPeerEnabled()).toBe(true);
    expect(isNegotiationPeerEnabled()).toBe(true);
  });
});
