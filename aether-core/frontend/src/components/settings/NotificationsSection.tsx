import React, { useId } from 'react';
import { Card, SegmentedControl, SettingRow, Switch } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { NotificationFrequency } from '@/lib/settings/merchantSettingsTypes';

export default function NotificationsSection() {
  const { settings, updateNotificationPrefs } = useMerchantSettings();
  const prefs = settings.notificationPrefs;
  const [saving, setSaving] = React.useState(false);
  const autonomousId = useId();
  const highRiskId = useId();
  const supplierId = useId();
  const weeklyId = useId();

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

  const toggleChannel = async (
    key: 'autonomousLowRisk' | 'highRiskApproval' | 'supplierChanges' | 'weeklyDigest',
    inApp: boolean,
  ) => {
    setSaving(true);
    try {
      await updateNotificationPrefs({
        [key]: { ...prefs[key], inApp },
      });
    } finally {
      setSaving(false);
    }
  };

  const rows: Array<{
    key: 'autonomousLowRisk' | 'highRiskApproval' | 'supplierChanges' | 'weeklyDigest';
    label: string;
    hint: string;
  }> = [
    {
      key: 'autonomousLowRisk',
      label: t('settings.notifications.autonomous'),
      hint: t('settings.notifications.autonomousHint'),
    },
    {
      key: 'highRiskApproval',
      label: t('settings.notifications.highRisk'),
      hint: t('settings.notifications.highRiskHint'),
    },
    {
      key: 'supplierChanges',
      label: t('settings.notifications.supplier'),
      hint: t('settings.notifications.supplierHint'),
    },
    {
      key: 'weeklyDigest',
      label: t('settings.notifications.weekly'),
      hint: t('settings.notifications.weeklyHint'),
    },
  ];

  return (
    <Card variant="elevated" padding="lg" data-testid="settings-notifications">
      <h2 className="text-title font-semibold text-foreground mb-6">
        {t('settings.section.notifications')}
      </h2>

      {rows.map((row) => {
        const switchId =
          row.key === 'autonomousLowRisk'
            ? autonomousId
            : row.key === 'highRiskApproval'
              ? highRiskId
              : row.key === 'supplierChanges'
                ? supplierId
                : weeklyId;
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
                  onCheckedChange={(v) => void toggleChannel(row.key, v)}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center gap-3 opacity-50">
                <span className="text-caption text-muted-foreground">
                  {t('settings.notifications.email')} ({t('settings.notifications.emailSoon')})
                </span>
                <Switch
                  id={`${switchId}-email-stub`}
                  checked={false}
                  onCheckedChange={() => {}}
                  disabled
                  aria-label={`${row.label}, ${t('settings.notifications.email')} (${t('settings.notifications.emailSoon')})`}
                />
              </div>
            </div>
          </SettingRow>
        );
      })}

      <SettingRow label={t('settings.notifications.frequency')} description="">
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
