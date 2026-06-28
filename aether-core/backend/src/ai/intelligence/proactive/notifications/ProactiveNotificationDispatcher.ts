import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import { smtpClient } from '../../../../modules/aether-mail/infrastructure/smtp/SmtpClient';
import { logger } from '../../../../shared/logging/logger';
import { resolveMerchantNotificationEmail } from '../../../../shared/notifications/resolveMerchantNotificationEmail';
import type { ProactiveSuggestionRecord } from '../ProactiveSuggestionRepository';
import {
  isProactiveEmailNotificationsEnabled,
  resolveProactiveEmailMaxPerHour,
} from '../proactiveConfig';
import { proactivePrefsAllowsIngest } from '../proactivePrefsFilter';

export class ProactiveNotificationDispatcher {
  private hourlyEmailCount = new Map<string, { hour: string; count: number }>();

  private canSendEmail(tenantId: string): boolean {
    const hour = new Date().toISOString().slice(0, 13);
    const entry = this.hourlyEmailCount.get(tenantId);
    const max = resolveProactiveEmailMaxPerHour();
    if (!entry || entry.hour !== hour) {
      this.hourlyEmailCount.set(tenantId, { hour, count: 0 });
      return true;
    }
    return entry.count < max;
  }

  private bumpEmailCount(tenantId: string): void {
    const hour = new Date().toISOString().slice(0, 13);
    const entry = this.hourlyEmailCount.get(tenantId);
    if (!entry || entry.hour !== hour) {
      this.hourlyEmailCount.set(tenantId, { hour, count: 1 });
    } else {
      entry.count += 1;
    }
  }

  async notifyCreated(tenantId: string, record: ProactiveSuggestionRecord): Promise<void> {
    const settings = await getMerchantSettings(tenantId);
    if (!proactivePrefsAllowsIngest(settings.proactivePrefs)) return;

    const prefs = settings.notificationPrefs.proactiveSuggestions;
    if (!prefs?.inApp && !prefs?.email) return;

    if (
      prefs.email &&
      isProactiveEmailNotificationsEnabled() &&
      settings.notificationPrefs.frequency === 'immediate' &&
      this.canSendEmail(tenantId)
    ) {
      const to = await resolveMerchantNotificationEmail(tenantId);
      if (to) {
        const result = await smtpClient.send({
          to,
          subject: `AETHER: ${record.title}`,
          body: `${record.title}\n\n${record.summary ?? record.command}\n\nOpen Command Center om te bekijken.`,
        });
        if (result.sent) {
          this.bumpEmailCount(tenantId);
          logger.info('proactive_email_sent', { tenantId, suggestionId: record.id, to });
        }
      }
    }
  }
}
