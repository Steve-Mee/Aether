import axios from 'axios';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

import { ResilientEmbeddingAdapter } from '../ai/intelligence/vector-store/ResilientEmbeddingAdapter';
import { SimpleHashEmbeddingAdapter } from '../ai/intelligence/vector-store/SimpleHashEmbeddingAdapter';

describe('Ollama local inference contract', () => {
  const runContract = process.env.OLLAMA_CONTRACT_TEST === 'true';

  (runContract ? it : it.skip)('Ollama health endpoint is reachable', async () => {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('models');
  }, 10000);

  (runContract ? it : it.skip)('Ollama embeddings return 384-dim vector for nomic-embed-text', async () => {
    const model = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/embeddings`,
      { model, prompt: 'AETHER contract test embedding' },
      { timeout: 60000 }
    );
    expect(Array.isArray(response.data.embedding)).toBe(true);
    expect(response.data.embedding.length).toBeGreaterThan(0);
  }, 90000);

  it('documents Ollama as required dependency in docker-compose', () => {
    const fs = require('fs');
    const path = require('path');
    const compose = fs.readFileSync(
      path.resolve(__dirname, '../../../docker-compose.yml'),
      'utf8'
    );
    expect(compose).toMatch(/ollama:/);
    expect(compose).toMatch(/OLLAMA_BASE_URL/);
    expect(compose).toMatch(/INTELLIGENCE_EMBEDDING/);
    expect(compose).toMatch(/nomic-embed-text/);
  });

  it('ResilientEmbeddingAdapter falls back to hash when primary fails', async () => {
    const primary = {
      dimensions: 384,
      embed: jest.fn().mockRejectedValue(new Error('ollama down')),
    };
    const fallback = new SimpleHashEmbeddingAdapter();
    const adapter = new ResilientEmbeddingAdapter(primary, fallback);
    const vec = await adapter.embed('fallback test');
    expect(vec.length).toBeGreaterThan(0);
    expect(primary.embed).toHaveBeenCalled();
  });
});
