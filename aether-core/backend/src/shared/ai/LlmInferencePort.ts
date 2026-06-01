export interface LlmGenerateRequest {
  prompt: string;
  temperature?: number;
}

export interface LlmInferencePort {
  generate(request: LlmGenerateRequest): Promise<string>;
  readonly model: string;
}
