import { SpecialistAgentRunner } from '../SpecialistAgentRunner';
import type { SpecialistAgentDefinition } from '../types';

jest.mock('../../../../shared/settings/agentPause', () => ({
  isAgentPaused: jest.fn(),
}));

import { isAgentPaused } from '../../../../shared/settings/agentPause';

const def: SpecialistAgentDefinition = {
  agentKey: 'pricing',
  memoryNamespace: 'pricing',
  displayName: 'Pricing',
  rolePrompt: 'Price things',
  supportedIntents: ['PRICE_UPDATE'],
  allowedTools: [],
};

describe('SpecialistAgentRunner pause enforcement', () => {
  beforeEach(() => {
    jest.mocked(isAgentPaused).mockReset();
  });

  it('blocks paused agents before execution', async () => {
    jest.mocked(isAgentPaused).mockResolvedValue(true);
    const registry = {
      get: jest.fn().mockReturnValue(def),
      resolve: jest.fn().mockReturnValue(def),
    };
    const runner = new SpecialistAgentRunner(
      registry as never,
      { get: jest.fn() } as never,
      { run: jest.fn() } as never
    );
    const result = await runner.run({
      tenantId: 't1',
      agentKey: 'pricing',
      intent: 'PRICE_UPDATE',
      command: 'update price',
      handlerResult: 'baseline',
      contextSnippets: [],
    });
    expect(result.error).toMatch(/gepauzeerd/);
    expect(result.narrative).toBe('baseline');
    expect(isAgentPaused).toHaveBeenCalledWith('t1', 'pricing');
  });
});
