import { PeerDelegationBridge, isMailPeerEnabled, isSupplierPeerEnabled } from '../PeerDelegationBridge';
import type { AgentOrchestrator } from '../../AgentSupervisorOrchestrator';

describe('PeerDelegationBridge', () => {
  const prevMail = process.env.MULTI_AGENT_MAIL_PEER;
  const prevSupplier = process.env.MULTI_AGENT_SUPPLIER_PEER;
  const prevDelegation = process.env.MULTI_AGENT_DELEGATION_ENABLED;

  beforeEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.MULTI_AGENT_MAIL_PEER = prevMail;
    process.env.MULTI_AGENT_SUPPLIER_PEER = prevSupplier;
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevDelegation;
  });

  it('feature flags default off', () => {
    delete process.env.MULTI_AGENT_MAIL_PEER;
    delete process.env.MULTI_AGENT_SUPPLIER_PEER;
    expect(isMailPeerEnabled()).toBe(false);
    expect(isSupplierPeerEnabled()).toBe(false);
  });

  it('delegates runSpecialist to orchestrator', async () => {
    const orchestrator = {
      executeSpecialist: jest.fn().mockResolvedValue({ narrative: 'done' }),
      chainHandoff: jest.fn(),
    } as unknown as AgentOrchestrator;
    const bridge = new PeerDelegationBridge(orchestrator);
    expect(bridge.isAvailable()).toBe(true);
    const result = await bridge.runSpecialist({
      tenantId: 't1',
      agentKey: 'mail',
      intent: 'EMAIL_SUMMARY',
      command: 'hello',
      contextSnippets: [],
      handlerResult: 'test',
    });
    expect(result.narrative).toBe('done');
    expect(orchestrator.executeSpecialist).toHaveBeenCalled();
  });
});
