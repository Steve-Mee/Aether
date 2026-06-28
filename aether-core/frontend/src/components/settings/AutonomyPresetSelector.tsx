import { useId } from 'react';
import { Card, SegmentedControl, SettingRow } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { AutonomyPreset } from '@/lib/settings/autonomyTypes';
import { AUTONOMY_PRESET_BUNDLES } from '@/lib/settings/autonomyPresets';
import type { MerchantSettings } from '@/lib/settings/merchantSettingsTypes';

const PRESET_OPTIONS: { value: Exclude<AutonomyPreset, 'custom'>; labelKey: string }[] = [
  { value: 'conservative', labelKey: 'settings.autonomy.preset.conservative' },
  { value: 'balanced', labelKey: 'settings.autonomy.preset.balanced' },
  { value: 'aggressive', labelKey: 'settings.autonomy.preset.aggressive' },
];

interface Props {
  preset: AutonomyPreset;
  onPresetChange: (preset: Exclude<AutonomyPreset, 'custom'>) => void;
  draft: MerchantSettings;
}

export default function AutonomyPresetSelector({ preset, onPresetChange, draft }: Props) {
  const id = useId();
  const activePreset =
    preset === 'custom' ? null : preset;

  const preview =
    activePreset != null ? AUTONOMY_PRESET_BUNDLES[activePreset] : null;

  return (
    <Card variant="elevated" padding="lg" data-testid="autonomy-preset-selector">
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t('settings.autonomy.preset.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{t('settings.autonomy.preset.subtitle')}</p>

      <SettingRow
        label={t('settings.autonomy.preset.label')}
        description={t('settings.autonomy.preset.labelHint')}
        htmlFor={id}
      >
        <SegmentedControl
          id={id}
          options={PRESET_OPTIONS.map((o) => ({
            value: o.value,
            label: t(o.labelKey),
          }))}
          value={
            (activePreset ?? 'balanced') as Exclude<AutonomyPreset, 'custom'>
          }
          onChange={(v) => onPresetChange(v as Exclude<AutonomyPreset, 'custom'>)}
          data-testid="autonomy-preset-control"
        />
      </SettingRow>

      {preset === 'custom' && (
        <p className="text-xs text-muted-foreground mt-3" data-testid="autonomy-preset-custom">
          {t('settings.autonomy.preset.customActive')}
        </p>
      )}

      {preview && (
        <div className="mt-4 rounded-xl border border-border/30 bg-muted/20 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2">{t('settings.autonomy.preset.preview')}</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              {t('settings.autonomy.level')}: {t(`settings.autonomy.level${preview.autonomyLevel === 'low' ? 'Low' : preview.autonomyLevel === 'high' ? 'High' : 'Medium'}`)}
            </li>
            <li>
              {t('settings.autonomy.autoLowRisk')}:{' '}
              {preview.autoApproveLowRisk ? t('common.yes') : t('common.no')}
            </li>
            <li>
              {t('settings.proactive.allowAutoExecute')}:{' '}
              {preview.proactiveAllowAutoExecute ? t('common.yes') : t('common.no')}
            </li>
            <li>
              {t('settings.goals.defaultPursuit')}:{' '}
              {t(`goals.pursuit.${preview.goalPursuitMode}`)}
            </li>
          </ul>
          <p className="mt-2 text-xs">
            {t('settings.autonomy.preset.currentMargin').replace(
              '{max}',
              `€${draft.maxMarginImpactEuro}`,
            )}
          </p>
        </div>
      )}
    </Card>
  );
}
