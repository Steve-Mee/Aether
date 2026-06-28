import axios from 'axios';
import type { EmbeddingPort } from './EmbeddingPort';
import { VECTOR_DIMENSION } from './types';

export class OllamaEmbeddingAdapter implements EmbeddingPort {
  readonly dimensions = VECTOR_DIMENSION;
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    const response = await axios.post(
      `${this.baseUrl}/api/embeddings`,
      { model: this.model, prompt: text },
      { timeout: 60000 }
    );
    const embedding = response.data?.embedding as number[] | undefined;
    if (!embedding?.length) {
      throw new Error('Ollama embedding response missing vector');
    }
    return embedding;
  }
}
