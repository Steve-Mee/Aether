import axios from 'axios';
import { mapBrainToolsToOllama, OllamaChatAdapter } from '../OllamaChatAdapter';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaChatAdapter', () => {
  it('maps brain tools to Ollama schema', () => {
    const mapped = mapBrainToolsToOllama([
      {
        name: 'search_products',
        description: 'Search products',
        kind: 'read',
        risk: 'low',
        module: 'product-catalog',
        parameters: {
          query: { type: 'string', description: 'Search query', required: true },
        },
      },
    ]);
    expect(mapped[0].function.name).toBe('search_products');
    expect(mapped[0].function.parameters.required).toEqual(['query']);
  });

  it('parses tool_calls from chat response', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        message: {
          content: '',
          tool_calls: [{ function: { name: 'search_products', arguments: { query: 'shirt' } } }],
        },
      },
    });

    const adapter = new OllamaChatAdapter('http://localhost:11434', 'llama3.2');
    const response = await adapter.chat({
      messages: [{ role: 'user', content: 'find shirts' }],
      tools: [],
    });

    expect(response.finishReason).toBe('tool_calls');
    expect(response.message.tool_calls).toHaveLength(1);
  });
});
