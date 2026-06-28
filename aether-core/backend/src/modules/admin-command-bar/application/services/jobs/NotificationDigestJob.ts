import { prisma } from '../../../../../shared/prisma/client';
import { getMerchantSettings } from '../../../../../shared/settings/TenantSettingsService';
import { overviewNotificationDispatcher } from '../OverviewNotificationDispatcher';
import { notificationEmitter } from '../notifications/NotificationEmitter';
import { materializeNotification } from '../notifications/NotificationWriter';
import { logger } from '../../../../../shared/logging/logger';

const HOURLY_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export class NotificationDigestJob {
  private timer?: ReturnType<typeof setInterval>;

  start(intervalMs = HOURLY_MS): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    void this.runAll();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private shouldSendDigest(
    frequency: 'daily' | 'weekly',
    lastSentAt: Date | null | undefined,
  ): boolean {
    if (!lastSentAt) return true;
    const elapsed = Date.now() - lastSentAt.getTime();
    return frequency === 'daily' ? elapsed >= DAY_MS : elapsed >= WEEK_MS;
  }

  async runAll(): Promise<void> {
    const tenants = await prisma.tenantSettings.findMany({ select: { tenantId: true } });
    for (const { tenantId } of tenants) {
      try {
        await this.runForTenant(tenantId);
      } catch (err) {
        logger.warn('notification_digest_failed', {
          tenantId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  async runForTenant(tenantId: string): Promise<number> {
    const settings = await getMerchantSettings(tenantId);
    const freq = settings.notificationPrefs.frequency;
    if (freq !== 'daily' && freq !== 'weekly') return 0;

    const digestState = await prisma.notificationDigestState.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId, updatedAt: new Date() },
    });

    if (!this.shouldSendDigest(freq, digestState.lastSentAt)) return 0;

    const windowStart = digestState.lastWindowStart ?? new Date(Date.now() - (freq === 'daily' ? DAY_MS : WEEK_MS));
    const sent = await overviewNotificationDispatcher.sendDigestForTenant(tenantId, windowStart);

    const digestNotification = {
      id: `digest-${tenantId}-${Date.now()}`,
      kind: 'system' as const,
      title: freq === 'daily' ? 'Dagelijkse samenvatting' : 'Wekelijkse samenvatting',
      body:
        sent > 0
          ? `${sent} items in je AETHER-overzicht`
          : 'Geen nieuwe items sinds de vorige samenvatting',
      severity: 'info' as const,
      read: false,
      createdAt: new Date().toISOString(),
      href: '/overview',
      actionLabel: 'Bekijk overzicht',
      source: 'system' as const,
      category: 'weekly_digest' as const,
    };

    if (settings.notificationPrefs.weeklyDigest.inApp) {
      const stored = await materializeNotification({
        tenantId,
        notification: digestNotification,
        sourceType: 'digest',
        sourceId: freq,
        skipGrouping: true,
      });
      if (stored) await notificationEmitter.emit(tenantId, stored, { sourceType: 'digest', sourceId: freq });
    }

    await prisma.notificationDigestState.update({
      where: { tenantId },
      data: {
        lastSentAt: new Date(),
        lastWindowStart: new Date(),
        updatedAt: new Date(),
      },
    });

    if (sent > 0) {
      logger.info('notification_digest_sent', { tenantId, count: sent, frequency: freq });
    }
    return sent;
  }
}

export const notificationDigestJob = new NotificationDigestJob();
