import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../shared/prisma/client';

jest.mock('../modules/aether-mail/infrastructure/smtp/SmtpClient', () => ({
  smtpClient: { send: jest.fn().mockResolvedValue({ sent: true, messageId: 'ollama_msg_1' }) },
}));

jest.mock('../modules/aether-mail/application/services/EmailClassifierService', () => ({
  EmailClassifierService: jest.fn().mockImplementation(() => ({
    classify: jest.fn().mockResolvedValue({
      category: 'tracking_request',
      riskLevel: 'low',
      confidence: 0.92,
      reason: 'LLM classification (mocked)',
      source: 'ollama',
    }),
  })),
}));

const describeIfDb = process.env.CI === 'true' ? describe : describe.skip;

describeIfDb('Mail Ollama path E2E (mocked classifier)', () => {
  const app = createApp();
  const headers = {
    'X-Aether-Api-Key': process.env.AETHER_API_KEY ?? 'ci-test-key',
    'X-Aether-Tenant-Id': 'tenant_default',
    'X-Aether-Actor-Id': 'e2e-test',
  };

  beforeAll(() => {
    process.env.AETHER_API_KEY = process.env.AETHER_API_KEY ?? 'ci-test-key';
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ollama classification → auto-reply', async () => {
    const res = await request(app)
      .post('/api/emails/process')
      .set(headers)
      .send({
        from: 'ollama-buyer@example.com',
        subject: 'Tracking please',
        body: 'Where is my package',
      });

    expect(res.status).toBe(201);
    expect(['replied', 'draft_ready']).toContain(res.body.status);
  });
});
