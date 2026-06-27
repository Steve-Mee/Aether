import crypto from 'crypto';
import type { EmbeddingPort } from './EmbeddingPort';
import { VECTOR_DIMENSION } from './types';

/**
 * Deterministic embedding for tests and CI without Ollama.
 * Not suitable for production semantic search quality.
 */
export class SimpleHashEmbeddingAdapter implements EmbeddingPort {
  readonly dimensions = VECTOR_DIMENSION;

  async embed(text: string): Promise<number[]> {
    const hash = crypto.createHash('sha256').update(text).digest();
    const vector: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      const byte = hash[i % hash.length];
      vector.push((byte / 255) * 2 - 1);
    }
    return vector;
  }
}

export const defaultSimpleHashEmbedding = new SimpleHashEmbeddingAdapter();
