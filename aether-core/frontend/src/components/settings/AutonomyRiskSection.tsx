import { useId, useState } from 'react';
import React from 'react';
import {
  Button,
  Card,
  RangeInput,
  SegmentedControl,
  SettingRow,
  Switch,
  TimeInput,
} from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { AutonomyLevel, AutoRunWindow } from '@/lib/settings/merchantSettingsTypes';

export default function AutonomyRiskSection() {
  const { settings, updateSettings } = useMerchantSettings();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const policyId = useId();
  const autoLowId = useId();
  const autoMailId = useId();
  const marginRangeId = useId();
  const priceRangeId = useId();

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        autonomyLevel: draft.autonomyLevel,
        policyEnabled: draft.policyEnabled,
        autoApproveLowRisk: draft.autoApproveLowRisk,
        autoApproveMediumRiskMail: draft.autoApproveMediumRiskMail,
        maxMarginImpactEuro: draft.maxMarginImpactEuro,
        maxAutoPriceChangePct: draft.maxAutoPriceChangePct,
        autoRunWindow: draft.autoRunWindow,
        autoRunWindowStart: draft.autoRunWindowStart,
        autoRunWindowEnd: draft.autoRunWindowEnd,
      });
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const levelOptions: { value: AutonomyLevel; label: string }[] = [
    { value: 'low', label: t('settings.autonomy.levelLow') },
    { value: 'medium', label: t('settings.autonomy.levelMedium') },
    { value: 'high', label: t('settings.autonomy.levelHigh') },
  ];

  const windowOptions: { value: AutoRunWindow; label: string }[] = [
    { value: 'always', label: t('settings.autonomy.autoRunAlways') },
    { value: 'outside_office', label: t('settings.autonomy.autoRunOutside') },
    { value: 'custom', label: t('settings.autonomy.autoRunCustom') },
  ];

  const marginHint = t('settings.autonomy.maxMarginHintDynamic').replace(
    '{max}',
    `€${draft.maxMarginImpactEuro}`,
  );

  return (
    <Card variant="elevated" padding="lg" data-testid="settings-autonomy">
      <h2 className="text-title font-semibold text-foreground mb-6">
        {t('settings.section.autonomy')}
      </h2>

      <SettingRow
        label={t('settings.autonomy.level')}
        description={t('settings.autonomy.levelHint')}
      >
        <SegmentedControl
          options={levelOptions}
          value={draft.autonomyLevel}
          onChange={(v) => setDraft((d) => ({ ...d, autonomyLevel: v }))}
          data-testid="autonomy-level"
          aria-label={t('settings.autonomy.level')}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.policyEnabled')}
        description={t('settings.autonomy.policyEnabledHint')}
        htmlFor={policyId}
      >
        <Switch
          id={policyId}
          checked={draft.policyEnabled}
          onCheckedChange={(v) => setDraft((d) => ({ ...d, policyEnabled: v }))}
          data-testid="policy-enabled"
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.autoLowRisk')}
        description={t('settings.autonomy.autoLowRiskHint')}
        htmlFor={autoLowId}
      >
        <Switch
          id={autoLowId}
          checked={draft.autoApproveLowRisk}
          onCheckedChange={(v) => setDraft((d) => ({ ...d, autoApproveLowRisk: v }))}
          data-testid="auto-low-risk"
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.autoMail')}
        description={t('settings.autonomy.autoMailHint')}
        htmlFor={autoMailId}
      >
        <Switch
          id={autoMailId}
          checked={draft.autoApproveMediumRiskMail}
          onCheckedChange={(v) => setDraft((d) => ({ ...d, autoApproveMediumRiskMail: v }))}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.maxMargin')}
        description={marginHint}
        htmlFor={marginRangeId}
      >
        <RangeInput
          id={marginRangeId}
          min={50}
          max={5000}
          step={50}
          value={draft.maxMarginImpactEuro}
          onChange={(e) => setDraft((d) => ({ ...d, maxMarginImpactEuro: Number(e.target.value) }))}
          valueLabel={`€${draft.maxMarginImpactEuro}`}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.maxPricePct')}
        description={t('settings.autonomy.maxPricePctHint')}
        htmlFor={priceRangeId}
      >
        <RangeInput
          id={priceRangeId}
          min={1}
          max={25}
          step={1}
          value={draft.maxAutoPriceChangePct}
          onChange={(e) =>
            setDraft((d) => ({ ...d, maxAutoPriceChangePct: Number(e.target.value) }))
          }
          valueLabel={`${draft.maxAutoPriceChangePct}%`}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.autoRunWindow')}
        description={
          draft.autoRunWindow === 'outside_office'
            ? t('settings.autonomy.autoRunOutsideHint')
            : t('settings.autonomy.autoRunHint')
        }
      >
        <SegmentedControl
          options={windowOptions}
          value={draft.autoRunWindow}
          onChange={(v) => setDraft((d) => ({ ...d, autoRunWindow: v }))}
          data-testid="auto-run-window"
          aria-label={t('settings.autonomy.autoRunWindow')}
        />
      </SettingRow>

      {draft.autoRunWindow === 'custom' && (
        <div className="flex flex-wrap gap-4 py-4 border-b border-border/30">
          <label className="text-sm">
            <span className="text-muted-foreground block mb-1">
              {t('settings.autonomy.windowStart')}
            </span>
            <TimeInput
              value={draft.autoRunWindowStart ?? '18:00'}
              onChange={(e) => setDraft((d) => ({ ...d, autoRunWindowStart: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground block mb-1">
              {t('settings.autonomy.windowEnd')}
            </span>
            <TimeInput
              value={draft.autoRunWindowEnd ?? '08:00'}
              onChange={(e) => setDraft((d) => ({ ...d, autoRunWindowEnd: e.target.value }))}
            />
          </label>
        </div>
      )}

      <div className="pt-6">
        <Button variant="primary" size="sm" disabled={!dirty || saving} onClick={save}>
          {t('settings.autonomy.save')}
        </Button>
      </div>
    </Card>
  );
}
