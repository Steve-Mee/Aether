export interface LlmGenerateRequest {
  prompt: string;
  temperature?: number;
}

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface LlmToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LlmToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface LlmChatRequest {
  messages: LlmChatMessage[];
  tools?: LlmToolDefinition[];
  temperature?: number;
  stream?: boolean;
}

export interface LlmChatResponse {
  message: {
    role: 'assistant';
    content: string;
    tool_calls?: LlmToolCall[];
  };
  finishReason: 'stop' | 'tool_calls';
}

export interface LlmInferencePort {
  generate(request: LlmGenerateRequest): Promise<string>;
  readonly model: string;
}

export interface LlmChatPort {
  chat(request: LlmChatRequest): Promise<LlmChatResponse>;
  readonly model: string;
}

export function useNativeOllamaTools(): boolean {
  return process.env.OLLAMA_USE_NATIVE_TOOLS === 'true';
}

export function useCommandBrainStreaming(): boolean {
  return process.env.COMMAND_BRAIN_STREAMING_ENABLED === 'true';
}
