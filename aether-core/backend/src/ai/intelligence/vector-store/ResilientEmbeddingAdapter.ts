import { logger } from '../../../shared/logging/logger';
import type { EmbeddingPort } from './EmbeddingPort';
import { OllamaEmbeddingAdapter } from './OllamaEmbeddingAdapter';
import {
  defaultSimpleHashEmbedding,
  SimpleHashEmbeddingAdapter,
} from './SimpleHashEmbeddingAdapter';
import { VECTOR_DIMENSION } from './types';

/**
 * Ollama primary with deterministic hash fallback when Ollama is unreachable.
 */
export class ResilientEmbeddingAdapter implements EmbeddingPort {
  readonly dimensions = VECTOR_DIMENSION;
  private primary: EmbeddingPort;
  private fallback: EmbeddingPort;

  constructor(primary?: EmbeddingPort, fallback?: EmbeddingPort) {
    this.primary = primary ?? new OllamaEmbeddingAdapter();
    this.fallback = fallback ?? defaultSimpleHashEmbedding;
  }

  async embed(text: string): Promise<number[]> {
    try {
      return await this.primary.embed(text);
    } catch (error) {
      logger.warn('embedding_ollama_fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallback.embed(text);
    }
  }
}

export function createProductionEmbedding(): EmbeddingPort {
  if (process.env.INTELLIGENCE_EMBEDDING === 'ollama') {
    return new ResilientEmbeddingAdapter();
  }
  return new SimpleHashEmbeddingAdapter();
}
