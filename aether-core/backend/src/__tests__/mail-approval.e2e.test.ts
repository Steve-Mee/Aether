import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../shared/prisma/client';

jest.mock('../modules/aether-mail/infrastructure/smtp/SmtpClient', () => ({
  smtpClient: { send: jest.fn().mockResolvedValue({ sent: true, messageId: 'test_msg_1' }) },
}));

jest.mock('../modules/aether-mail/application/services/EmailClassifierService', () => ({
  EmailClassifierService: jest.fn().mockImplementation(() => ({
    classify: jest.fn().mockImplementation(async (raw: { body?: string; subject?: string }) => {
      const text = `${raw.subject ?? ''} ${raw.body ?? ''}`.toLowerCase();
      const highRisk = /refund|lawyer|legal|complaint|angry/.test(text);
      return {
        category: highRisk ? 'complaint' : 'order_tracking',
        riskLevel: highRisk ? 'high' : 'low',
        confidence: 0.5,
        source: 'heuristic',
      };
    }),
  })),
}));

const describeIfDb = process.env.CI === 'true' ? describe : describe.skip;

describeIfDb('Mail approval E2E (DB-backed)', () => {
  const app = createApp();
  const headers = {
    'X-Aether-Api-Key': process.env.AETHER_API_KEY ?? 'ci-test-key',
    'X-Aether-Tenant-Id': 'tenant_default',
    'X-Aether-Actor-Id': 'e2e-test',
  };

  beforeAll(async () => {
    process.env.AETHER_API_KEY = process.env.AETHER_API_KEY ?? 'ci-test-key';
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('heuristic fallback → escalated (no auto-reply)', async () => {
    const res = await request(app)
      .post('/api/emails/process')
      .set(headers)
      .send({
        from: 'buyer@example.com',
        subject: 'Where is my tracking number',
        body: 'Please send tracking for order 123',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('escalated');
    expect(res.body.approvalId).toBeDefined();

    const audit = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant_default', module: 'aether-mail', action: 'email_processed' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
    const parsed =
      typeof audit?.details === 'string' ? JSON.parse(audit.details) : audit?.details;
    expect(parsed?.classification?.source).toBe('heuristic');
  });

  it('high-risk email → approval → resolve → rollback', async () => {
    const res = await request(app)
      .post('/api/emails/process')
      .set(headers)
      .send({
        from: 'angry@example.com',
        subject: 'Refund now',
        body: 'I want a refund angry lawyer legal complaint',
      });

    expect(res.status).toBe(201);
    expect(res.body.approvalId).toBeDefined();

    const approvalId = res.body.approvalId as string;
    const emailId = res.body.id as string;

    const resolve = await request(app)
      .post(`/api/approvals/${approvalId}/resolve`)
      .set(headers)
      .send({ approve: true });
    expect(resolve.status).toBe(200);

    const approved = await prisma.approval.findUnique({ where: { id: approvalId } });
    expect(approved?.status).toBe('approved');

    const rollback = await request(app).post(`/api/emails/${emailId}/rollback`).set(headers);
    expect(rollback.status).toBe(200);

    const email = await prisma.emailMessage.findUnique({ where: { id: emailId } });
    expect(email?.status).toBe('received');

    const cancelled = await prisma.approval.findUnique({ where: { id: approvalId } });
    expect(cancelled?.status).toBe('cancelled');
  });
});
