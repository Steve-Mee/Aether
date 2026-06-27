import { AgentTranscript } from '../AgentTranscript';

describe('AgentTranscript', () => {
  it('builds tool and proposal messages', () => {
    const t = new AgentTranscript();
    t.addUser('update prices');
    t.addToolResult({
      toolCallId: 'tc1',
      tool: 'search_products',
      output: '3 products',
      status: 'ok',
    });
    t.addProposal({
      proposalId: 'p1',
      tool: 'updatePrice',
      summary: 'Raise prices 5%',
      risk: 'medium',
    });

    const messages = t.getMessages();
    expect(messages).toHaveLength(3);
    expect(messages[1]).toMatchObject({ role: 'tool', tool: 'search_products' });
    expect(messages[2]).toMatchObject({ role: 'proposal', proposalId: 'p1' });
  });

  it('round-trips via JSON', () => {
    const original = new AgentTranscript();
    original.addSystem('You are AETHER');
    original.addAssistant('Checking inventory');

    const restored = AgentTranscript.fromJSON(original.toJSON());
    expect(restored.getMessages()).toEqual(original.getMessages());
  });

  it('toPromptBlock includes tool output', () => {
    const t = new AgentTranscript();
    t.addToolResult({ toolCallId: '1', tool: 'recall_memory', output: 'past command', status: 'ok' });
    expect(t.toPromptBlock()).toContain('[tool:recall_memory]');
  });
});
