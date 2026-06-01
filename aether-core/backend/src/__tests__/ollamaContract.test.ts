import axios from 'axios';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

describe('Ollama local inference contract', () => {
  const runContract = process.env.OLLAMA_CONTRACT_TEST === 'true';

  (runContract ? it : it.skip)('Ollama health endpoint is reachable', async () => {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('models');
  }, 10000);

  it('documents Ollama as required dependency in docker-compose', () => {
    const fs = require('fs');
    const path = require('path');
    const compose = fs.readFileSync(
      path.resolve(__dirname, '../../../docker-compose.yml'),
      'utf8'
    );
    expect(compose).toMatch(/ollama:/);
    expect(compose).toMatch(/OLLAMA_BASE_URL/);
  });
});
