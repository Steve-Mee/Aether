import { BrainAgentLoop } from '../BrainAgentLoop';
import type { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import type { ToolProposal } from '../../personal-brain/tools/types';

jest.mock('../BrainAgentRunStore', () => ({
  createBrainAgentRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
  updateBrainAgentRun: jest.fn().mockResolvedValue(undefined),
  updateBrainAgentRunCheckpoint: jest.fn().mockResolvedValue(undefined),
  getBrainAgentRunById: jest.fn(),
  parseResumeContext: jest.fn(),
}));

import {
  createBrainAgentRun,
  updateBrainAgentRunCheckpoint,
} from '../BrainAgentRunStore';

describe('BrainAgentLoop checkpoint', () => {
  const proposal: ToolProposal = {
    proposalId: 'prop-1',
    tool: 'updatePrice',
    summary: 'Verhoog prijs met 15%',
    risk: 'medium',
    requiresApproval: true,
    approvalId: 'appr-1',
    payload: { productId: 'p1', pct: 15 },
  };

  const mockTools = {
    getSchemaPrompt: () => 'Available tools',
    execute: jest.fn().mockResolvedValue({
      output: 'Proposal created',
      trace: {
        tool: 'propose_updatePrice',
        input: { productId: 'p1' },
        output: 'Proposal created',
        status: 'proposed' as const,
      },
      proposal,
    }),
  } as unknown as PersonalBrainToolRegistry;

  const mockLlm: LlmInferencePort = {
    model: 'test',
    generate: jest.fn().mockResolvedValue(
      JSON.stringify({ tool: 'propose_updatePrice', input: { productId: 'p1', pct: 15 } })
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COMMAND_BRAIN_PLANNING_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.COMMAND_BRAIN_PLANNING_ENABLED;
  });

  it('pauses with checkpoint when proposal requires inbox approval', async () => {
    const loop = new BrainAgentLoop(mockTools, mockLlm);
    const events: string[] = [];
    const result = await loop.run({
      tenantId: 'tenant_cp',
      command: 'Verhoog prijs product p1',
      parsedIntent: 'PRICE_UPDATE',
      parameters: {},
      contextSnippets: [],
      handlerResult: 'Handler done',
      persistRun: true,
      onEvent: (e) => events.push(e.type),
    });

    expect(createBrainAgentRun).toHaveBeenCalled();
    expect(updateBrainAgentRunCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'run-1',
        tenantId: 'tenant_cp',
        pendingApprovalId: 'appr-1',
        pendingProposalId: 'prop-1',
      })
    );
    expect(result.checkpoint).toBe(true);
    expect(result.awaitingApprovalId).toBe('appr-1');
    expect(result.runStatus).toBe('awaiting_approval');
    expect(result.pendingActions).toHaveLength(1);
    expect(events).toContain('checkpoint');
  });

  it('does not checkpoint when proposal has no approvalId', async () => {
    const noInboxTools = {
      getSchemaPrompt: () => 'tools',
      execute: jest.fn().mockResolvedValue({
        output: 'done',
        trace: { tool: 'search_products', input: {}, output: 'ok', status: 'ok' as const },
      }),
    } as unknown as PersonalBrainToolRegistry;

    const llm: LlmInferencePort = {
      model: 'test',
      generate: jest
        .fn()
        .mockResolvedValueOnce(JSON.stringify({ tool: 'search_products', input: { query: 'x' } }))
        .mockResolvedValueOnce(
          JSON.stringify({ final: { narrative: 'Klaar.', actionProposal: 'Geen actie' } })
        ),
    };

    const loop = new BrainAgentLoop(noInboxTools, llm);
    const result = await loop.run({
      tenantId: 'tenant_no_cp',
      command: 'Zoek product',
      parsedIntent: 'UNKNOWN',
      parameters: {},
      contextSnippets: [],
      handlerResult: 'Fallback',
      persistRun: false,
    });

    expect(result.checkpoint).toBeUndefined();
    expect(updateBrainAgentRunCheckpoint).not.toHaveBeenCalled();
  });
});
