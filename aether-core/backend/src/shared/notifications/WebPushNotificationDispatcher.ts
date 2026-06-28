import webpush from 'web-push';
import { prisma } from '../prisma/client';
import { getMerchantSettings } from '../settings/TenantSettingsService';
import { logger } from '../logging/logger';
import type { MerchantNotification } from '../../modules/admin-command-bar/application/services/notifications/notificationTypes';
import { isInAppNotificationEnabled } from '../../modules/admin-command-bar/application/services/notifications/notificationPrefUtils';

function isWebPushEnabled(): boolean {
  const v = process.env.WEB_PUSH_ENABLED;
  if (v === 'false' || v === '0') return false;
  return Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY);
}

function ensureVapid(): void {
  if (!isWebPushEnabled()) return;
  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT ?? 'mailto:support@aether.local',
    process.env.WEB_PUSH_PUBLIC_KEY!,
    process.env.WEB_PUSH_PRIVATE_KEY!,
  );
}

export function getWebPushPublicKey(): string | null {
  return process.env.WEB_PUSH_PUBLIC_KEY ?? null;
}

export class WebPushNotificationDispatcher {
  async deliver(
    tenantId: string,
    actorId: string | undefined,
    notification: MerchantNotification,
  ): Promise<void> {
    if (!isWebPushEnabled() || !actorId) return;

    const category = notification.category ?? 'general';
    try {
      const settings = await getMerchantSettings(tenantId);
      const prefKey = category === 'proactive_suggestion'
        ? 'proactiveSuggestions'
        : category === 'goal_progress'
          ? 'goalProgress'
          : category === 'high_risk_approval'
            ? 'highRiskApproval'
            : category === 'supplier_change'
              ? 'supplierChanges'
              : category === 'weekly_digest'
                ? 'weeklyDigest'
                : 'autonomousLowRisk';
      const channel = settings.notificationPrefs[prefKey as keyof typeof settings.notificationPrefs];
      if (!channel || typeof channel !== 'object' || !('push' in channel) || !channel.push) return;
      if (!isInAppNotificationEnabled(settings.notificationPrefs, category)) return;
    } catch {
      return;
    }

    ensureVapid();

    const subs = await prisma.pushSubscription.findMany({
      where: { tenantId, actorId },
    });

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      href: notification.href,
      id: notification.id,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch (err) {
        logger.warn('web_push_failed', {
          tenantId,
          actorId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

export const webPushNotificationDispatcher = new WebPushNotificationDispatcher();
