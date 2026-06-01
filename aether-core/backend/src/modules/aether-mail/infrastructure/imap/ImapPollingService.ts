import { ImapClient } from './ImapClient';
import { decryptMailboxCredentials } from './mailboxCredentials';
import { ProcessIncomingEmailUseCase } from '../../application/use-cases/ProcessIncomingEmailUseCase';
import { prisma } from '../../../../shared/prisma/client';
import { logger } from '../../../../shared/logging/logger';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

interface MailboxTarget {
  id: string;
  tenantId: string;
  pollingPolicy: string;
  client: ImapClient;
}

const POLICY_INTERVALS: Record<string, number> = {
  default: 60000,
  aggressive: 30000,
  relaxed: 120000,
  paused: 0,
};

export class ImapPollingService {
  private timer: NodeJS.Timeout | null = null;
  private targets: MailboxTarget[] = [];
  private retryCount = 0;
  private circuitOpen = false;
  private circuitOpenUntil = 0;
  private shuttingDown = false;

  private getProcessEmailUseCase(): ProcessIncomingEmailUseCase {
    return getCompositionRoot().processIncomingEmailUseCase;
  }

  isEnvConfigured(): boolean {
    return Boolean(process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASSWORD);
  }

  async loadTargets(): Promise<MailboxTarget[]> {
    const rows = await prisma.mailbox.findMany();
    const fromDb: MailboxTarget[] = [];

    for (const row of rows) {
      if (row.pollingPolicy === 'paused') continue;
      const creds = decryptMailboxCredentials(row);
      if (!creds) continue;
      fromDb.push({
        id: row.id,
        tenantId: row.tenantId,
        pollingPolicy: row.pollingPolicy,
        client: new ImapClient({
          user: creds.user,
          password: creds.password,
          host: creds.host,
          port: creds.port,
          tls: creds.tls,
        }),
      });
    }

    if (fromDb.length > 0) return fromDb;

    if (this.isEnvConfigured()) {
      const fallbackTenant = process.env.AETHER_DEFAULT_TENANT;
      if (!fallbackTenant) {
        logger.warn('imap_env_fallback_skipped', { reason: 'AETHER_DEFAULT_TENANT not set' });
        return [];
      }
      return [
        {
          id: 'env-default',
          tenantId: fallbackTenant,
          pollingPolicy: 'default',
          client: new ImapClient({
            user: process.env.IMAP_USER!,
            password: process.env.IMAP_PASSWORD!,
            host: process.env.IMAP_HOST!,
            port: parseInt(process.env.IMAP_PORT ?? '993', 10),
            tls: process.env.IMAP_TLS !== 'false',
          }),
        },
      ];
    }

    return [];
  }

  private pollMailbox(target: MailboxTarget): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = target.client;
      const onReady = async () => {
        try {
          const emails = await client.fetchUnseenEmails();
          for (const msg of emails) {
            if (!msg.from) continue;
            await this.getProcessEmailUseCase().execute(
              {
                from: msg.from,
                subject: msg.subject,
                body: msg.body,
                messageId: msg.messageId,
              },
              { tenantId: target.tenantId, actorId: 'imap-poller' }
            );
          }
          client.disconnect();
          resolve();
        } catch (err) {
          client.disconnect();
          reject(err);
        }
      };
      client.once('ready', () => void onReady());
      client.once('error', reject);
      client.connect();
    });
  }

  async start(): Promise<void> {
    if (this.shuttingDown) return;
    this.targets = await this.loadTargets();
    if (this.targets.length === 0) {
      logger.info('imap_polling_no_targets');
      return;
    }
    const minInterval = Math.min(
      ...this.targets.map((t) => POLICY_INTERVALS[t.pollingPolicy] ?? POLICY_INTERVALS.default)
    );
    if (minInterval <= 0) return;

    const poll = async () => {
      if (this.circuitOpen && Date.now() < this.circuitOpenUntil) return;
      for (const target of this.targets) {
        const interval = POLICY_INTERVALS[target.pollingPolicy] ?? POLICY_INTERVALS.default;
        if (interval <= 0) continue;
        try {
          await this.pollMailbox(target);
          this.retryCount = 0;
          this.circuitOpen = false;
        } catch (error) {
          this.retryCount += 1;
          logger.warn('imap_poll_failed', {
            mailboxId: target.id,
            error: String(error),
            retryCount: this.retryCount,
          });
          if (this.retryCount >= MAX_RETRIES) {
            this.circuitOpen = true;
            this.circuitOpenUntil = Date.now() + BASE_BACKOFF_MS * 2 ** this.retryCount;
          }
        }
      }
    };

    await poll();
    this.timer = setInterval(() => void poll(), minInterval);
    logger.info('imap_polling_started', { targets: this.targets.length, intervalMs: minInterval });
  }

  stop(): void {
    this.shuttingDown = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const imapPollingService = new ImapPollingService();
