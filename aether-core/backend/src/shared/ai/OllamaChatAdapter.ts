import axios from 'axios';
import type {
  LlmChatPort,
  LlmChatRequest,
  LlmChatResponse,
  LlmToolDefinition,
} from './LlmInferencePort';
import type { BrainToolDefinition } from '../../ai/intelligence/personal-brain/tools/PersonalBrainToolRegistry';

export function mapBrainToolsToOllama(tools: BrainToolDefinition[]): LlmToolDefinition[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(t.parameters).map(([key, param]) => [
            key,
            { type: param.type, description: param.description },
          ])
        ),
        required: Object.entries(t.parameters)
          .filter(([, p]) => p.required)
          .map(([k]) => k),
      },
    },
  }));
}

export class OllamaChatAdapter implements LlmChatPort {
  readonly model: string;
  private baseUrl: string;

  constructor(
    baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model = process.env.OLLAMA_MODEL || 'llama3.2'
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: this.model,
        messages: request.messages,
        tools: request.tools,
        stream: false,
        options: { temperature: request.temperature ?? 0.2 },
      },
      { timeout: 60000 }
    );

    const message = response.data.message ?? {};
    const toolCalls = message.tool_calls as LlmChatResponse['message']['tool_calls'];
    return {
      message: {
        role: 'assistant',
        content: String(message.content ?? ''),
        tool_calls: toolCalls,
      },
      finishReason: toolCalls?.length ? 'tool_calls' : 'stop',
    };
  }
}

export const defaultOllamaChat = new OllamaChatAdapter();
