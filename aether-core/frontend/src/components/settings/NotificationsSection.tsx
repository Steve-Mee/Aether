import React from 'react';
import { Card, SegmentedControl, SettingRow, Switch } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { NotificationFrequency } from '@/lib/settings/merchantSettingsTypes';

type NotificationKey =
  | 'autonomousLowRisk'
  | 'highRiskApproval'
  | 'supplierChanges'
  | 'weeklyDigest'
  | 'proactiveSuggestions'
  | 'goalProgress';

export default function NotificationsSection() {
  const { settings, updateNotificationPrefs } = useMerchantSettings();
  const prefs = settings.notificationPrefs;
  const [saving, setSaving] = React.useState(false);
  const autonomousId = React.useId();
  const highRiskId = React.useId();
  const supplierId = React.useId();
  const weeklyId = React.useId();
  const proactiveId = React.useId();
  const goalProgressId = React.useId();

  const freqOptions: { value: NotificationFrequency; label: string }[] = [
    { value: 'immediate', label: t('settings.notifications.freqImmediate') },
    { value: 'daily', label: t('settings.notifications.freqDaily') },
    { value: 'weekly', label: t('settings.notifications.freqWeekly') },
  ];

  const saveFrequency = async (frequency: NotificationFrequency) => {
    setSaving(true);
    try {
      await updateNotificationPrefs({ frequency });
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = async (key: NotificationKey, field: 'inApp' | 'email' | 'push', value: boolean) => {
    setSaving(true);
    try {
      await updateNotificationPrefs({
        [key]: { ...prefs[key], [field]: value },
      });
      if (field === 'push') {
        const nextPrefs = { ...prefs, [key]: { ...prefs[key], push: value } };
        const channelKeys: NotificationKey[] = [
          'autonomousLowRisk',
          'highRiskApproval',
          'supplierChanges',
          'weeklyDigest',
          'proactiveSuggestions',
          'goalProgress',
        ];
        const anyPush = channelKeys.some((k) => nextPrefs[k].push === true);
        const { syncWebPushSubscription } = await import('@/lib/notifications/useWebPushSubscription');
        await syncWebPushSubscription(anyPush);
      }
    } finally {
      setSaving(false);
    }
  };

  const rows: Array<{ key: NotificationKey; label: string; hint: string; emailEnabled: boolean }> = [
    {
      key: 'autonomousLowRisk',
      label: t('settings.notifications.autonomous'),
      hint: t('settings.notifications.autonomousHint'),
      emailEnabled: true,
    },
    {
      key: 'highRiskApproval',
      label: t('settings.notifications.highRisk'),
      hint: t('settings.notifications.highRiskHint'),
      emailEnabled: true,
    },
    {
      key: 'supplierChanges',
      label: t('settings.notifications.supplier'),
      hint: t('settings.notifications.supplierHint'),
      emailEnabled: true,
    },
    {
      key: 'weeklyDigest',
      label: t('settings.notifications.weekly'),
      hint: t('settings.notifications.weeklyHint'),
      emailEnabled: true,
    },
    {
      key: 'proactiveSuggestions',
      label: t('settings.notifications.proactive'),
      hint: t('settings.notifications.proactiveHint'),
      emailEnabled: true,
    },
    {
      key: 'goalProgress',
      label: t('settings.notifications.goalProgress'),
      hint: t('settings.notifications.goalProgressHint'),
      emailEnabled: true,
    },
  ];

  const switchIds: Record<NotificationKey, string> = {
    autonomousLowRisk: autonomousId,
    highRiskApproval: highRiskId,
    supplierChanges: supplierId,
    weeklyDigest: weeklyId,
    proactiveSuggestions: proactiveId,
    goalProgress: goalProgressId,
  };

  return (
    <Card variant="elevated" padding="lg" data-testid="settings-notifications">
      <h2 className="text-title font-semibold text-foreground mb-6">
        {t('settings.section.notifications')}
      </h2>

      {rows.map((row) => {
        const switchId = switchIds[row.key];
        return (
          <SettingRow key={row.key} label={row.label} description={row.hint} htmlFor={switchId}>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <span className="text-caption text-muted-foreground">
                  {t('settings.notifications.inApp')}
                </span>
                <Switch
                  id={switchId}
                  checked={prefs[row.key].inApp}
                  onCheckedChange={(v) => void toggleChannel(row.key, 'inApp', v)}
                  disabled={saving}
                />
              </div>
              <div
                className={`flex items-center gap-3 ${row.emailEnabled ? '' : 'opacity-50'}`}
              >
                <span className="text-caption text-muted-foreground">
                  {t('settings.notifications.email')}
                  {!row.emailEnabled ? ` (${t('settings.notifications.emailSoon')})` : ''}
                </span>
                <Switch
                  id={`${switchId}-email`}
                  checked={row.emailEnabled ? prefs[row.key].email : false}
                  onCheckedChange={(v) => row.emailEnabled && void toggleChannel(row.key, 'email', v)}
                  disabled={saving || !row.emailEnabled}
                  aria-label={`${row.label}, ${t('settings.notifications.email')}`}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-caption text-muted-foreground">
                  {t('settings.notifications.push')}
                </span>
                <Switch
                  id={`${switchId}-push`}
                  checked={prefs[row.key].push === true}
                  onCheckedChange={(v) => void toggleChannel(row.key, 'push', v)}
                  disabled={saving}
                  aria-label={`${row.label}, ${t('settings.notifications.push')}`}
                />
              </div>
            </div>
          </SettingRow>
        );
      })}

      <SettingRow
        label={t('settings.notifications.frequency')}
        description={t('settings.notifications.frequencyDigestHint')}
      >
        <SegmentedControl
          options={freqOptions}
          value={prefs.frequency}
          onChange={(v) => void saveFrequency(v)}
          data-testid="notification-frequency"
          aria-label={t('settings.notifications.frequency')}
        />
      </SettingRow>
    </Card>
  );
}
