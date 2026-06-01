import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../shared/prisma/client';

jest.mock('../modules/aether-mail/infrastructure/smtp/SmtpClient', () => ({
  smtpClient: { send: jest.fn().mockResolvedValue({ sent: true, messageId: 'test_msg_exec' }) },
}));

jest.mock('../modules/aether-mail/application/services/EmailClassifierService', () => ({
  EmailClassifierService: jest.fn().mockImplementation(() => ({
    classify: jest.fn().mockResolvedValue({
      category: 'complaint',
      riskLevel: 'high',
      confidence: 0.5,
      source: 'heuristic',
    }),
  })),
}));

const describeIfDb = process.env.CI === 'true' ? describe : describe.skip;

describeIfDb('Mail approval execute E2E (DB-backed)', () => {
  const app = createApp();
  const headers = {
    'X-Aether-Api-Key': process.env.AETHER_API_KEY ?? 'ci-test-key',
    'X-Aether-Tenant-Id': 'tenant_default',
    'X-Aether-Actor-Id': 'e2e-test',
  };

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('escalate → approve → email replied + action_executed audit', async () => {
    const res = await request(app)
      .post('/api/emails/process')
      .set(headers)
      .send({
        from: 'buyer-exec@example.com',
        subject: 'Refund angry lawyer',
        body: 'I want a refund angry lawyer legal complaint',
      });

    expect(res.status).toBe(201);
    const approvalId = res.body.approvalId as string;
    const emailId = res.body.id as string;
    expect(approvalId).toBeDefined();

    const resolve = await request(app)
      .post(`/api/approvals/${approvalId}/resolve`)
      .set(headers)
      .send({ approve: true });
    expect(resolve.status).toBe(200);

    const email = await prisma.emailMessage.findUnique({ where: { id: emailId } });
    expect(email?.status).toBe('replied');

    const executed = await prisma.auditLog.findFirst({
      where: {
        tenantId: 'tenant_default',
        action: 'action_executed',
        details: { contains: approvalId },
      },
    });
    expect(executed).toBeTruthy();
  });
});
