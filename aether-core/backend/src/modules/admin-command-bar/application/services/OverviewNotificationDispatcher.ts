import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import type { MailSenderPort } from '../../../aether-mail/application/ports/MailSenderPort';
import { logger } from '../../../../shared/logging/logger';
import { resolveMerchantNotificationEmail } from '../../../../shared/notifications/resolveMerchantNotificationEmail';
import type { OverviewFeedPort } from '../ports/OverviewFeedPort';
import type { OverviewFeedItem } from './OverviewFeedService';
import { overviewHighlightHref } from './OverviewFeedService';
import {
  isOverviewEmailNotificationsEnabled,
  resolveOverviewEmailMaxPerHour,
} from './overviewFeedConfig';

type NotificationCategory =
  | 'autonomousLowRisk'
  | 'highRiskApproval'
  | 'supplierChanges'
  | 'proactiveSuggestions';

function categoryForItem(item: OverviewFeedItem): NotificationCategory | null {
  if (item.kind === 'proactive') return 'proactiveSuggestions';
  if (item.kind === 'approval' && item.payload.status === 'pending') return 'highRiskApproval';
  if (item.kind === 'activity') {
    const module = String(item.payload.module ?? '');
    if (module.includes('supplier')) return 'supplierChanges';
    if (item.payload.status === 'autonomous') return 'autonomousLowRisk';
  }
  return null;
}

function subjectForItem(item: OverviewFeedItem): string {
  const label = String(
    item.payload.label ??
      item.payload.title ??
      item.payload.actionLabel ??
      item.payload.description ??
      item.id,
  );
  return `AETHER — ${label}`.slice(0, 120);
}

function hrefForItem(item: OverviewFeedItem): string {
  if (item.kind === 'approval') return overviewHighlightHref('approval', item.id);
  if (item.kind === 'proactive') return overviewHighlightHref('proactive', item.id);
  if (item.kind === 'activity') return overviewHighlightHref('activity', item.id);
  return '/overview';
}

export class OverviewNotificationDispatcher {
  private hourlyCount = new Map<string, { hour: string; count: number }>();

  constructor(
    private overviewFeedPort: OverviewFeedPort,
    private mailSender: MailSenderPort,
  ) {}

  private canSend(tenantId: string): boolean {
    const hour = new Date().toISOString().slice(0, 13);
    const entry = this.hourlyCount.get(tenantId);
    const max = resolveOverviewEmailMaxPerHour();
    if (!entry || entry.hour !== hour) {
      this.hourlyCount.set(tenantId, { hour, count: 0 });
      return true;
    }
    return entry.count < max;
  }

  private bump(tenantId: string): void {
    const hour = new Date().toISOString().slice(0, 13);
    const entry = this.hourlyCount.get(tenantId);
    if (!entry || entry.hour !== hour) {
      this.hourlyCount.set(tenantId, { hour, count: 1 });
    } else {
      entry.count += 1;
    }
  }

  async onFeedEventCreated(
    tenantId: string,
    feedEventId: string,
    item: OverviewFeedItem,
  ): Promise<void> {
    if (!isOverviewEmailNotificationsEnabled()) return;

    const settings = await getMerchantSettings(tenantId);
    if (settings.notificationPrefs.frequency !== 'immediate') return;

    const category = categoryForItem(item);
    if (!category) return;

    const prefs = settings.notificationPrefs[category];
    if (!prefs?.email) return;
    if (!this.canSend(tenantId)) return;

    const to = await resolveMerchantNotificationEmail(tenantId);
    if (!to) return;

    const baseUrl = process.env.AETHER_PUBLIC_URL ?? 'http://localhost:5173';
    const link = `${baseUrl}${hrefForItem(item)}`;
    const body = `${subjectForItem(item)}\n\nBekijk in AETHER Overzicht:\n${link}`;

    try {
      const result = await this.mailSender.send({ to, subject: subjectForItem(item), body });
      if (result.sent) {
        this.bump(tenantId);
        await this.overviewFeedPort.markEmailDispatched(feedEventId);
      }
    } catch (err) {
      logger.warn('overview_email_failed', {
        tenantId,
        feedEventId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async sendDigestForTenant(tenantId: string, since: Date): Promise<number> {
    if (!isOverviewEmailNotificationsEnabled()) return 0;

    const settings = await getMerchantSettings(tenantId);
    const freq = settings.notificationPrefs.frequency;
    if (freq !== 'daily' && freq !== 'weekly') return 0;
    if (!settings.notificationPrefs.weeklyDigest.email) return 0;

    const rows = await this.overviewFeedPort.findUndispatchedForDigest(tenantId, since, 20);

    if (rows.length === 0) return 0;

    const to = await resolveMerchantNotificationEmail(tenantId);
    if (!to) return 0;

    const baseUrl = process.env.AETHER_PUBLIC_URL ?? 'http://localhost:5173';
    const lines = rows.map((r) => {
      const payload = r.payload as Record<string, unknown>;
      const label = String(payload.label ?? payload.title ?? payload.description ?? r.itemId);
      return `- ${label}`;
    });
    const body = `AETHER overzicht (${rows.length} items)\n\n${lines.join('\n')}\n\n${baseUrl}/overview`;

    try {
      const result = await this.mailSender.send({
        to,
        subject: `AETHER — Overzicht digest (${rows.length})`,
        body,
      });
      if (!result.sent) return 0;
      await this.overviewFeedPort.markManyEmailDispatched(rows.map((r) => r.id));
      return rows.length;
    } catch {
      return 0;
    }
  }
}
