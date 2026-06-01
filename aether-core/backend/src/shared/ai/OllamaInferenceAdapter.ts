import axios from 'axios';
import type { LlmGenerateRequest, LlmInferencePort } from './LlmInferencePort';

export class OllamaInferenceAdapter implements LlmInferencePort {
  readonly model: string;
  private baseUrl: string;

  constructor(
    baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model = process.env.OLLAMA_MODEL || 'llama3.2'
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async generate(request: LlmGenerateRequest): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/api/generate`,
      {
        model: this.model,
        prompt: request.prompt,
        stream: false,
        options: { temperature: request.temperature ?? 0.1 },
      },
      { timeout: 60000 }
    );
    return String(response.data.response ?? '');
  }
}

export const defaultOllamaInference = new OllamaInferenceAdapter();
