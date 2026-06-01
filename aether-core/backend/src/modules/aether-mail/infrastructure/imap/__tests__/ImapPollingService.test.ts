import { ImapPollingService } from '../ImapPollingService';

jest.mock('../../../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: jest.fn(() => ({
    processIncomingEmailUseCase: { execute: jest.fn() },
  })),
}));

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    mailbox: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

describe('ImapPollingService', () => {
  it('reports env configured when IMAP vars set', () => {
    const prev = { ...process.env };
    process.env.IMAP_HOST = 'imap.test';
    process.env.IMAP_USER = 'u';
    process.env.IMAP_PASSWORD = 'p';
    const service = new ImapPollingService();
    expect(service.isEnvConfigured()).toBe(true);
    process.env = prev;
  });

  it('loadTargets returns empty when no mailboxes', async () => {
    const service = new ImapPollingService();
    const targets = await service.loadTargets();
    expect(targets).toEqual([]);
  });
});
