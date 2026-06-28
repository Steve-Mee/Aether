import React from 'react';
import { Card, SegmentedControl, SettingRow } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { Locale } from '@/lib/settings/merchantSettingsTypes';

export default function GeneralPreferencesSection() {
  const { settings, updateSettings } = useMerchantSettings();

  const localeOptions: { value: Locale; label: string }[] = [
    { value: 'nl', label: t('settings.general.localeNl') },
    { value: 'en', label: t('settings.general.localeEn') },
  ];

  return (
    <Card variant="elevated" padding="lg" data-testid="settings-general">
      <h2 className="text-title font-semibold text-foreground mb-6">
        {t('settings.section.general')}
      </h2>

      <SettingRow
        label={t('settings.general.locale')}
        description={t('settings.general.localeHint')}
      >
        <SegmentedControl
          options={localeOptions}
          value={settings.locale}
          onChange={(v) => void updateSettings({ locale: v })}
          data-testid="locale-select"
          aria-label={t('settings.general.locale')}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.general.timezone')}
        description={t('settings.general.timezoneHint')}
      >
        <span className="text-body text-muted-foreground">Europe/Amsterdam</span>
      </SettingRow>
    </Card>
  );
}
