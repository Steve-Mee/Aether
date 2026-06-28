import React from 'react';
import { Card, SegmentedControl, SettingRow, Switch } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { ExplainabilityDetailLevel } from '@/lib/settings/merchantSettingsTypes';

export default function ExplainabilitySection() {
  const { settings, updateSettings } = useMerchantSettings();
  const prefs = settings.explainabilityPrefs;

  const levelOptions: { value: ExplainabilityDetailLevel; label: string }[] = [
    { value: 'off', label: t('settings.explainability.off') },
    { value: 'simple', label: t('settings.explainability.simple') },
    { value: 'extended', label: t('settings.explainability.extended') },
  ];

  const hintKey =
    prefs.detailLevel === 'off'
      ? 'settings.explainability.offHint'
      : prefs.detailLevel === 'extended'
        ? 'settings.explainability.extendedHint'
        : 'settings.explainability.simpleHint';

  const patchPrefs = (partial: Partial<typeof prefs>) =>
    void updateSettings({ explainabilityPrefs: { ...prefs, ...partial } });

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-base font-medium">{t('settings.explainability.title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.explainability.subtitle')}
        </p>
      </div>
      <SettingRow label={t('settings.explainability.title')} description={t(hintKey)}>
        <SegmentedControl
          value={prefs.detailLevel}
          options={levelOptions}
          onChange={(detailLevel) =>
            patchPrefs({ detailLevel: detailLevel as ExplainabilityDetailLevel })
          }
          aria-label={t('settings.explainability.title')}
        />
      </SettingRow>
      {prefs.detailLevel !== 'off' && (
        <>
          <SettingRow
            label={t('settings.explainability.useLlmSummary')}
            description={t('settings.explainability.useLlmSummaryHint')}
          >
            <Switch
              checked={prefs.useLlmSummary === true}
              onCheckedChange={(useLlmSummary) => patchPrefs({ useLlmSummary })}
              aria-label={t('settings.explainability.useLlmSummary')}
            />
          </SettingRow>
          <SettingRow label={t('settings.explainability.showLiveExplain')}>
            <Switch
              checked={prefs.showLiveExplain !== false}
              onCheckedChange={(showLiveExplain) => patchPrefs({ showLiveExplain })}
              aria-label={t('settings.explainability.showLiveExplain')}
            />
          </SettingRow>
          <SettingRow label={t('settings.explainability.showSimilarActions')}>
            <Switch
              checked={prefs.showSimilarActions !== false}
              onCheckedChange={(showSimilarActions) => patchPrefs({ showSimilarActions })}
              aria-label={t('settings.explainability.showSimilarActions')}
            />
          </SettingRow>
          <SettingRow
            label={t('settings.explainability.showCrossTenantSimilarActions')}
            description={t('settings.explainability.showCrossTenantSimilarActionsHint')}
          >
            <Switch
              checked={prefs.showCrossTenantSimilarActions === true}
              onCheckedChange={(showCrossTenantSimilarActions) =>
                patchPrefs({ showCrossTenantSimilarActions })
              }
              aria-label={t('settings.explainability.showCrossTenantSimilarActions')}
            />
          </SettingRow>
          <SettingRow
            label={t('settings.explainability.federatePatterns')}
            description={t('settings.explainability.federatePatternsHint')}
          >
            <Switch
              checked={settings.brainExplainabilityFederateEnabled === true}
              onCheckedChange={(brainExplainabilityFederateEnabled) =>
                void updateSettings({ brainExplainabilityFederateEnabled })
              }
              aria-label={t('settings.explainability.federatePatterns')}
            />
          </SettingRow>
        </>
      )}
    </Card>
  );
}
